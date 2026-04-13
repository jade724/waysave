// netlify/functions/fetch-fuel-stations.ts
import type { Handler, HandlerEvent } from "@netlify/functions";

// Use GOOGLE_MAPS_API_KEY on the server (VITE_ prefix is for client-side only)
const GOOGLE_MAPS_KEY =
  process.env.GOOGLE_MAPS_API_KEY ?? process.env.VITE_GOOGLE_MAPS_API_KEY;

/** Minimal shape returned by Nearby Search (server forwards JSON as-is). */
interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
  business_status?: string;
  rating?: number;
  types?: string[];
  opening_hours?: { open_now?: boolean };
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { lat, lng, radius, pagetoken, mode } = event.queryStringParameters || {};
  /** Nearby = type gas_station. Text = Text Search "gas station" near point — overlaps Maps app results better. */
  const searchMode = mode === "text" ? "text" : "nearby";

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing lat/lng parameters" }),
    };
  }

  if (!GOOGLE_MAPS_KEY?.trim()) {
    return {
      statusCode: 503,
      headers,
      body: JSON.stringify({
        error:
          "Server missing Google Maps API key. Set GOOGLE_MAPS_API_KEY or VITE_GOOGLE_MAPS_API_KEY in .env (local) or Netlify env (production).",
      }),
    };
  }

  try {
    const url =
      searchMode === "text"
        ? new URL("https://maps.googleapis.com/maps/api/place/textsearch/json")
        : new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");

    if (searchMode === "text") {
      url.searchParams.append("query", "gas station");
      url.searchParams.append("location", `${lat},${lng}`);
      url.searchParams.append("radius", radius || "5000");
    } else {
      url.searchParams.append("location", `${lat},${lng}`);
      url.searchParams.append("radius", radius || "5000");
      url.searchParams.append("type", "gas_station");
    }
    url.searchParams.append("key", GOOGLE_MAPS_KEY.trim());

    if (pagetoken) {
      url.searchParams.append("pagetoken", pagetoken);
    }

    const response = await fetch(url.toString());
    const raw = await response.text();
    let data: GooglePlacesResponse;
    try {
      data = raw ? (JSON.parse(raw) as GooglePlacesResponse) : ({} as GooglePlacesResponse);
    } catch {
      console.error("Google Places non-JSON response:", response.status, raw.slice(0, 500));
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Google Places returned invalid JSON",
          status: response.status,
        }),
      };
    }

    if (!response.ok) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({
          error: "Google Places HTTP error",
          status: response.status,
          google: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error("Error fetching from Google Places:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to fetch stations",
        message: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export { handler };
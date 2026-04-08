// netlify/functions/fetch-fuel-stations.ts
import type { Handler, HandlerEvent } from "@netlify/functions";

// Use GOOGLE_MAPS_API_KEY on the server (VITE_ prefix is for client-side only)
const GOOGLE_MAPS_KEY = process.env.GOOGLE_MAPS_API_KEY ?? process.env.VITE_GOOGLE_MAPS_API_KEY

interface GooglePlacesResponse {
  results: any[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

const handler: Handler = async (event: HandlerEvent) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  const { lat, lng, radius, pagetoken } = event.queryStringParameters || {};

  if (!lat || !lng) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Missing lat/lng parameters" }),
    };
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.append("location", `${lat},${lng}`);
    url.searchParams.append("radius", radius || "5000");
    url.searchParams.append("type", "gas_station");
    url.searchParams.append("key", GOOGLE_MAPS_KEY!);
    
    if (pagetoken) {
      url.searchParams.append("pagetoken", pagetoken);
    }

    const response = await fetch(url.toString());
    
    // ✅ FIX: Add type assertion
    const data = await response.json() as GooglePlacesResponse;

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
      body: JSON.stringify({ error: "Failed to fetch stations" }),
    };
  }
};

export { handler };
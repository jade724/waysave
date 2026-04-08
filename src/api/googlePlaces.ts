// src/api/googlePlaces.ts
// Use Netlify serverless function to bypass CORS

const BACKEND_URL = import.meta.env.DEV 
  ? "http://localhost:8888/.netlify/functions" 
  : "/.netlify/functions";

interface GooglePlaceResult {
  place_id: string;
  name: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  vicinity?: string;
  business_status?: string;
  rating?: number;
  user_ratings_total?: number;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
  };
}

interface GooglePlacesResponse {
  results: GooglePlaceResult[];
  status: string;
  error_message?: string;
  next_page_token?: string;
}

/**
 * Fetch gas stations via Netlify serverless function
 */
export async function fetchFuelStationsFromGoogle(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  maxResults: number = 60
): Promise<GooglePlaceResult[]> {
  
  if (radiusMeters > 50000) {
    console.warn("⚠️ Radius capped at 50km (Google Places limit)");
    radiusMeters = 50000;
  }

  const allResults: GooglePlaceResult[] = [];
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = Math.min(3, Math.ceil(maxResults / 20));

  try {
    console.log(`🔍 Fetching gas stations from Google Places (${radiusMeters}m radius)...`);

    do {
      // Build request URL to Netlify function
      const url = new URL(`${BACKEND_URL}/fetch-fuel-stations`, window.location.origin);
      url.searchParams.append("lat", lat.toString());
      url.searchParams.append("lng", lng.toString());
      url.searchParams.append("radius", radiusMeters.toString());
      
      if (nextPageToken) {
        url.searchParams.append("pagetoken", nextPageToken);
        console.log(`📄 Fetching page ${pageCount + 1}...`);
      }

      const response = await fetch(url.toString());
      const data: GooglePlacesResponse = await response.json();

      // Handle errors
      if (data.status === "REQUEST_DENIED") {
        console.error("❌ Google Places API request denied:", data.error_message);
        throw new Error("Places API request denied. Check API key permissions.");
      }

      if (data.status === "OVER_QUERY_LIMIT") {
        console.error("❌ Google Places API quota exceeded");
        throw new Error("API quota exceeded. Try again later.");
      }

      if (data.status === "ZERO_RESULTS") {
        console.log("⚠️ No gas stations found in this area");
        break;
      }

      if (data.status !== "OK") {
        console.error("❌ Google Places API error:", data.status, data.error_message);
        throw new Error(`Places API error: ${data.status}`);
      }

      allResults.push(...data.results);
      pageCount++;

      console.log(`✅ Page ${pageCount}: Found ${data.results.length} stations (Total: ${allResults.length})`);

      nextPageToken = data.next_page_token;

      if (allResults.length >= maxResults || pageCount >= maxPages) {
        break;
      }

      if (nextPageToken) {
        console.log("⏳ Waiting 2 seconds for next page token...");
        await delay(2000);
      }

    } while (nextPageToken && pageCount < maxPages);

    console.log(`✅ Total: Found ${allResults.length} gas stations`);
    return allResults;

  } catch (error) {
    console.error("❌ Failed to fetch from Google Places:", error);
    
    if (allResults.length > 0) {
      console.warn(`⚠️ Returning ${allResults.length} partial results`);
      return allResults;
    }
    
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatGooglePlaceToStation(place: GooglePlaceResult): any {
 
  return {
    id: place.place_id,
    externalId: place.place_id,
    name: place.name,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    type: "fuel" as const,
    price_value: null,
    price_label: null,
    address: place.vicinity,
    rating: place.rating,
    isOpen: place.opening_hours?.open_now,
    status: place.business_status,
    raw: place,
  };
}
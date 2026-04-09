// src/api/googlePlaces.ts
// Use Netlify serverless function to bypass CORS

import type { Station } from "../types/station";
import { devError, devLog, devWarn } from "../lib/logger";

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
 * Nearby Search returns INVALID_REQUEST if `pagetoken` is not yet valid (Google requires a delay).
 * Retrying avoids aborting the whole fetch and leaving only the first 20 results.
 */
async function fetchNearbySearchPage(url: URL): Promise<GooglePlacesResponse> {
  const isPagination = url.searchParams.has("pagetoken");
  const maxAttempts = isPagination ? 6 : 1;
  let last: GooglePlacesResponse | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      const waitMs = 2000 + attempt * 1500;
      devLog(
        `⏳ Pagetoken not ready (INVALID_REQUEST), waiting ${waitMs}ms — retry ${attempt}/${maxAttempts - 1}`
      );
      await delay(waitMs);
    }

    const response = await fetch(url.toString());
    last = (await response.json()) as GooglePlacesResponse;

    if (last.status !== "INVALID_REQUEST") {
      return last;
    }
    if (!isPagination) {
      return last;
    }
  }

  return last!;
}

/**
 * Fetch gas stations via Netlify serverless function
 */
/** Nearby Search returns max 20 per page and max 60 total (3 pages). */
const PLACES_NEARBY_MAX_PAGES = 3;
const PLACES_PAGE_SIZE = 20;

export async function fetchFuelStationsFromGoogle(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  maxResults: number = 60
): Promise<GooglePlaceResult[]> {
  
  if (radiusMeters > 50000) {
    devWarn("⚠️ Radius capped at 50km (Google Places limit)");
    radiusMeters = 50000;
  }

  const allResults: GooglePlaceResult[] = [];
  const seenIds = new Set<string>();
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const cappedMax = Math.min(maxResults, PLACES_NEARBY_MAX_PAGES * PLACES_PAGE_SIZE);
  const maxPages = Math.min(PLACES_NEARBY_MAX_PAGES, Math.ceil(cappedMax / PLACES_PAGE_SIZE));

  try {
    devLog(`🔍 Fetching gas stations from Google Places (${radiusMeters}m radius)...`);

    do {
      // Build request URL to Netlify function
      const url = new URL(`${BACKEND_URL}/fetch-fuel-stations`, window.location.origin);
      url.searchParams.append("lat", lat.toString());
      url.searchParams.append("lng", lng.toString());
      url.searchParams.append("radius", radiusMeters.toString());
      
      if (nextPageToken) {
        url.searchParams.append("pagetoken", nextPageToken);
        devLog(`📄 Fetching page ${pageCount + 1}...`);
      }

      const data = await fetchNearbySearchPage(url);

      // Handle errors
      if (data.status === "REQUEST_DENIED") {
        devError("❌ Google Places API request denied:", data.error_message);
        throw new Error("Places API request denied. Check API key permissions.");
      }

      if (data.status === "OVER_QUERY_LIMIT") {
        devError("❌ Google Places API quota exceeded");
        throw new Error("API quota exceeded. Try again later.");
      }

      if (data.status === "ZERO_RESULTS") {
        devLog("⚠️ No gas stations found in this area");
        break;
      }

      if (data.status !== "OK") {
        devError("❌ Google Places API error:", data.status, data.error_message);
        throw new Error(`Places API error: ${data.status}`);
      }

      for (const place of data.results) {
        if (!seenIds.has(place.place_id)) {
          seenIds.add(place.place_id);
          allResults.push(place);
        }
      }
      pageCount++;

      devLog(`✅ Page ${pageCount}: Found ${data.results.length} stations (Total: ${allResults.length})`);

      nextPageToken = data.next_page_token;

      if (allResults.length >= cappedMax || pageCount >= maxPages) {
        break;
      }

      if (nextPageToken) {
        // Token is not valid immediately; a short wait reduces INVALID_REQUEST on the next fetch.
        devLog("⏳ Waiting before next page (Places pagetoken)...");
        await delay(3000);
      }

    } while (nextPageToken && pageCount < maxPages);

    devLog(`✅ Total: Found ${allResults.length} gas stations`);
    return allResults;

  } catch (error) {
    devError("❌ Failed to fetch from Google Places:", error);
    
    if (allResults.length > 0) {
      devWarn(`⚠️ Returning ${allResults.length} partial results`);
      return allResults;
    }
    
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatGooglePlaceToStation(place: GooglePlaceResult): Station {
  return {
    id: place.place_id,
    externalId: place.place_id,
    name: place.name,
    lat: place.geometry.location.lat,
    lng: place.geometry.location.lng,
    type: "fuel" as const,
    fuelTypes: "both",
    price_value: null,
    price_label: null,
    address: place.vicinity,
    rating: place.rating,
    isOpen: place.opening_hours?.open_now,
    status: place.business_status,
    raw: place,
  };
}
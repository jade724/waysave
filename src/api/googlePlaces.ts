// src/api/googlePlaces.ts
// Use Netlify serverless function to bypass CORS

import type { Station } from "../types/station";
import { devError, devLog, devWarn } from "../lib/logger";
import { NETLIFY_FUNCTIONS_BASE } from "../lib/netlifyFunctionsUrl";

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
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Places proxy returned non-JSON (HTTP ${response.status}): ${text.slice(0, 120)}`
      );
    }
    if (!response.ok) {
      const errBody = parsed as { error?: string; message?: string };
      throw new Error(
        errBody.error ??
          errBody.message ??
          `Places proxy HTTP ${response.status}`
      );
    }
    last = parsed as GooglePlacesResponse;

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
/** Nearby / Text Search: max 20 per page, 3 pages each. */
const PLACES_NEARBY_MAX_PAGES = 3;
const PLACES_PAGE_SIZE = 20;
/** Text Search pass adds stations Google ranks differently vs Nearby-only (e.g. some Circle K). */
const MERGED_MAX_STATIONS = 80;

type PlacesMode = "nearby" | "text";

export async function fetchFuelStationsFromGoogle(
  lat: number,
  lng: number,
  radiusMeters: number = 5000,
  maxResults: number = MERGED_MAX_STATIONS
): Promise<GooglePlaceResult[]> {
  if (radiusMeters > 50000) {
    devWarn("⚠️ Radius capped at 50km (Google Places limit)");
    radiusMeters = 50000;
  }

  const allResults: GooglePlaceResult[] = [];
  const seenIds = new Set<string>();

  const nearbyCap = Math.min(maxResults, PLACES_NEARBY_MAX_PAGES * PLACES_PAGE_SIZE);
  const mergedCap = Math.min(Math.max(maxResults, nearbyCap), MERGED_MAX_STATIONS);

  try {
    devLog(`🔍 Fetching gas stations from Google Places (${radiusMeters}m radius)...`);

    await appendPlacesPages({
      mode: "nearby",
      lat,
      lng,
      radiusMeters,
      allResults,
      seenIds,
      stopWhenCount: nearbyCap,
      label: "Nearby Search (type=gas_station)",
    });

    devLog(`📍 Merging Text Search "gas station" (Maps-style overlap)…`);

    try {
      await appendPlacesPages({
        mode: "text",
        lat,
        lng,
        radiusMeters,
        allResults,
        seenIds,
        stopWhenCount: mergedCap,
        label: "Text Search",
      });
    } catch (textErr) {
      devWarn("⚠️ Text Search merge skipped (Nearby results still used):", textErr);
    }

    devLog(`✅ Total unique gas stations: ${allResults.length}`);
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

async function appendPlacesPages(opts: {
  mode: PlacesMode;
  lat: number;
  lng: number;
  radiusMeters: number;
  allResults: GooglePlaceResult[];
  seenIds: Set<string>;
  stopWhenCount: number;
  label: string;
}): Promise<void> {
  const { mode, lat, lng, radiusMeters, allResults, seenIds, stopWhenCount, label } = opts;
  let nextPageToken: string | undefined;
  let pageCount = 0;
  const maxPages = PLACES_NEARBY_MAX_PAGES;

  do {
    if (allResults.length >= stopWhenCount) return;

    const url = new URL(`${NETLIFY_FUNCTIONS_BASE}/fetch-fuel-stations`, window.location.origin);
    url.searchParams.append("lat", lat.toString());
    url.searchParams.append("lng", lng.toString());
    url.searchParams.append("radius", radiusMeters.toString());
    url.searchParams.append("mode", mode);

    if (nextPageToken) {
      url.searchParams.append("pagetoken", nextPageToken);
      devLog(`📄 ${label} — page ${pageCount + 1}…`);
    }

    const data = await fetchNearbySearchPage(url);

    if (data.status === "REQUEST_DENIED") {
      devError("❌ Google Places API request denied:", data.error_message);
      throw new Error("Places API request denied. Check API key permissions.");
    }

    if (data.status === "OVER_QUERY_LIMIT") {
      devError("❌ Google Places API quota exceeded");
      throw new Error("API quota exceeded. Try again later.");
    }

    if (data.status === "ZERO_RESULTS") {
      devLog(`⚠️ ${label}: no results`);
      break;
    }

    if (data.status !== "OK") {
      devError("❌ Google Places API error:", data.status, data.error_message);
      throw new Error(`Places API error: ${data.status}`);
    }

    for (const place of data.results) {
      if (allResults.length >= stopWhenCount) break;
      if (!seenIds.has(place.place_id)) {
        seenIds.add(place.place_id);
        allResults.push(place);
      }
    }
    pageCount++;

    devLog(
      `✅ ${label} page ${pageCount}: ${data.results.length} raw (${allResults.length} unique total)`
    );

    nextPageToken = data.next_page_token;

    if (pageCount >= maxPages || allResults.length >= stopWhenCount) {
      break;
    }

    if (nextPageToken) {
      devLog("⏳ Waiting before next page (Places pagetoken)...");
      await delay(3000);
    }
  } while (nextPageToken && pageCount < maxPages && allResults.length < stopWhenCount);
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
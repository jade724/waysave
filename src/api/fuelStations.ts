// src/api/fuelStations.ts
// Load fuel stations with Google Places API respecting user preferences

import { fetchFuelStationsFromGoogle, formatGooglePlaceToStation } from "./googlePlaces";
import { devError, devLog } from "../lib/logger";
import { calculateDistanceKm } from "../lib/distance";
import { effectiveSearchRadiusKm, matchesFuelTypeFilter } from "../lib/stationFilters";
import type { FuelTypeFilter } from "../lib/preferences";
import type { Station } from "../types/station";

/**
 * Load fuel stations using Google Places API with user preferences
 * 
 * Strategy:
 * 1. Use user's maxDistanceKm preference for radius
 * 2. Fetch stations within that radius (Google Nearby Search caps at 60 per query)
 * 3. Calculate distances using Haversine formula
 * 4. Let ranking algorithm filter/sort based on preferences
 * 5. Fallback to hardcoded data if API fails
 * 
 * @param userLat - User's latitude
 * @param userLng - User's longitude
 * @param maxDistanceKm - OPTIONAL: Override max distance (from user preferences)
 * @returns Array of fuel stations with distances
 */
export async function loadFuelStations(
  userLat: number,
  userLng: number,
  maxDistanceKm?: number, 
  fuelType?: FuelTypeFilter
): Promise<Station[]> {
  
  const searchRadiusKm = effectiveSearchRadiusKm(maxDistanceKm);
  const searchRadiusMeters = searchRadiusKm * 1000;
 
  // Google Places Nearby Search max radius is 50,000 m
  const cappedRadiusMeters = Math.min(searchRadiusMeters, 50000);
 
  // Step 1: Try Google Places API first (with type assertion for better typing)
  try {
    devLog(`🔍 Loading fuel stations within ${searchRadiusKm}km...`);
    
    // ✅ FIX: Add type assertion to ensure we get the expected structure
    const googlePlaces = await fetchFuelStationsFromGoogle(
      userLat, 
      userLng, 
      cappedRadiusMeters, 
      60
    );
    
    if (googlePlaces.length > 0) {
      let stations = googlePlaces.map(formatGooglePlaceToStation);

      for (const station of stations) {
        station.distance_km = calculateDistanceKm(
          userLat,
          userLng,
          station.lat,
          station.lng
        );
      }

      if (fuelType) {
        stations = stations.filter((s) => matchesFuelTypeFilter(s, fuelType));
      }

      // Match list + EV behaviour: only keep stations within the user’s max distance (straight-line km).
      if (maxDistanceKm != null && maxDistanceKm > 0) {
        stations = stations.filter(
          (s) => s.distance_km != null && s.distance_km <= maxDistanceKm
        );
      }

      devLog(`✅ Loaded ${stations.length} fuel stations from Google Places`);
      return stations;
    }
 
  } catch (error) {
    devError("⚠️ Google Places failed, using fallback data:", error);
  }
 
  // Step 2: Fallback to hardcoded stations if API fails or returns no results
  devLog("⚠️ Using hardcoded Irish fuel stations");
  return getHardcodedIrishStations(userLat, userLng, fuelType, maxDistanceKm);
}
 
/**
 * Hardcoded Irish fuel stations (fallback)
 * Real Dublin locations with mock prices
 */


// All real Irish forecourts sell both petrol and diesel.
// fuelTypes is used to filter when the user selects petrol/diesel/both.
type HardcodedStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel";
  price_value: number;
  fuelTypes: "petrol" | "diesel" | "both";
};
  const HARDCODED_STATIONS: HardcodedStation[] = [
  { id: "applegreen-m50-red-cow",   name: "Applegreen M50 Red Cow",    lat: 53.3194, lng: -6.3706, type: "fuel", price_value: 1.52, fuelTypes: "both" },
  { id: "circle-k-tallaght",        name: "Circle K Tallaght",          lat: 53.2859, lng: -6.3733, type: "fuel", price_value: 1.48, fuelTypes: "both" },
  { id: "maxol-blanchardstown",     name: "Maxol Blanchardstown",       lat: 53.3928, lng: -6.3772, type: "fuel", price_value: 1.51, fuelTypes: "both" },
  { id: "texaco-dundrum",           name: "Texaco Dundrum",             lat: 53.2872, lng: -6.2439, type: "fuel", price_value: 1.49, fuelTypes: "both" },
  { id: "topaz-swords",             name: "Circle K Swords",            lat: 53.4597, lng: -6.2181, type: "fuel", price_value: 1.47, fuelTypes: "both" },
  { id: "esso-rathmines",           name: "Esso Rathmines",             lat: 53.3214, lng: -6.2661, type: "fuel", price_value: 1.50, fuelTypes: "both" },
  { id: "applegreen-liffey-valley", name: "Applegreen Liffey Valley",   lat: 53.3528, lng: -6.3917, type: "fuel", price_value: 1.53, fuelTypes: "both" },
  { id: "maxol-ballymun",           name: "Maxol Ballymun",             lat: 53.3967, lng: -6.2644, type: "fuel", price_value: 1.46, fuelTypes: "both" },
  { id: "circle-k-clonskeagh",      name: "Circle K Clonskeagh",        lat: 53.3047, lng: -6.2297, type: "fuel", price_value: 1.51, fuelTypes: "both" },
  { id: "texaco-stillorgan",        name: "Texaco Stillorgan",          lat: 53.2914, lng: -6.1997, type: "fuel", price_value: 1.50, fuelTypes: "both" },
  { id: "applegreen-santry",        name: "Applegreen Santry",          lat: 53.4028, lng: -6.2486, type: "fuel", price_value: 1.48, fuelTypes: "both" },
  { id: "maxol-rathfarnham",        name: "Maxol Rathfarnham",          lat: 53.3006, lng: -6.2817, type: "fuel", price_value: 1.49, fuelTypes: "both" },
  { id: "esso-dun-laoghaire",       name: "Esso Dun Laoghaire",         lat: 53.2944, lng: -6.1336, type: "fuel", price_value: 1.52, fuelTypes: "both" },
  { id: "circle-k-blackrock",       name: "Circle K Blackrock",         lat: 53.3014, lng: -6.1781, type: "fuel", price_value: 1.51, fuelTypes: "both" },
  { id: "texaco-churchtown",        name: "Texaco Churchtown",          lat: 53.2997, lng: -6.2681, type: "fuel", price_value: 1.47, fuelTypes: "both" },
  { id: "applegreen-m1-balbriggan", name: "Applegreen M1 Balbriggan",   lat: 53.6078, lng: -6.1842, type: "fuel", price_value: 1.46, fuelTypes: "both" },
  { id: "circle-k-malahide",        name: "Circle K Malahide",          lat: 53.4500, lng: -6.1542, type: "fuel", price_value: 1.49, fuelTypes: "both" },
  { id: "maxol-howth",              name: "Maxol Howth",                lat: 53.3889, lng: -6.0669, type: "fuel", price_value: 1.51, fuelTypes: "both" },
  { id: "texaco-portmarnock",       name: "Texaco Portmarnock",         lat: 53.4236, lng: -6.1392, type: "fuel", price_value: 1.48, fuelTypes: "both" },
  { id: "applegreen-naas-road",     name: "Applegreen Naas Road",       lat: 53.3278, lng: -6.3856, type: "fuel", price_value: 1.50, fuelTypes: "both" },
];

function getHardcodedIrishStations(
  userLat: number,
  userLng: number,
  fuelType?: FuelTypeFilter,
  maxDistanceKm?: number
): Station[] {
  const filtered = fuelType
    ? HARDCODED_STATIONS.filter((s) =>
        fuelType === "both" || s.fuelTypes === "both" || s.fuelTypes === fuelType
      )
    : HARDCODED_STATIONS;

  let stations: Station[] = filtered.map((station) => ({
    ...station,
    price_label: `€${station.price_value.toFixed(2)}/L`,
    distance_km: calculateDistanceKm(userLat, userLng, station.lat, station.lng),
  }));

  if (maxDistanceKm != null && maxDistanceKm > 0) {
    stations = stations.filter(
      (s) => s.distance_km != null && s.distance_km <= maxDistanceKm
    );
  }

  return stations;
}
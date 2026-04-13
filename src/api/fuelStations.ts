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
      80
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
 * Real Dublin-area locations. Petrol/diesel €/L sampled from user-provided market snapshots
 * (c/L from listings, converted ÷100) — illustrative only when Google Places is unavailable.
 */


// All real Irish forecourts sell both petrol and diesel.
// fuelTypes is used to filter when the user selects petrol/diesel/both.
type HardcodedStation = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel";
  /** €/L — from sampled c/L (e.g. 191.9c → 1.919) */
  petrolEur: number;
  dieselEur: number;
  fuelTypes: "petrol" | "diesel" | "both";
};
  const HARDCODED_STATIONS: HardcodedStation[] = [
  // Applegreen Ballymount 189.8c / 212.8c
  { id: "applegreen-m50-red-cow",   name: "Applegreen M50 Red Cow",    lat: 53.3194, lng: -6.3706, type: "fuel", petrolEur: 1.898, dieselEur: 2.128, fuelTypes: "both" },
  // Circle K Fonthill 191.9c / 217.9c
  { id: "circle-k-tallaght",        name: "Circle K Tallaght",          lat: 53.2859, lng: -6.3733, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Maxol Cromwellsfort Rd 189.9c / 213.9c
  { id: "maxol-blanchardstown",     name: "Maxol Blanchardstown",       lat: 53.3928, lng: -6.3772, type: "fuel", petrolEur: 1.899, dieselEur: 2.139, fuelTypes: "both" },
  // Certa Ballymount 189.9c / 212.9c
  { id: "texaco-dundrum",           name: "Texaco Dundrum",             lat: 53.2872, lng: -6.2439, type: "fuel", petrolEur: 1.899, dieselEur: 2.129, fuelTypes: "both" },
  // Circle K St Peter's 191.9c / 217.9c
  { id: "topaz-swords",             name: "Circle K Swords",            lat: 53.4597, lng: -6.2181, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Applegreen Crumlin 191.9c / 214.9c
  { id: "esso-rathmines",           name: "Esso Rathmines",             lat: 53.3214, lng: -6.2661, type: "fuel", petrolEur: 1.919, dieselEur: 2.149, fuelTypes: "both" },
  // Circle K Round Tower Naas Rd 191.9c / 217.9c
  { id: "applegreen-liffey-valley", name: "Applegreen Liffey Valley",   lat: 53.3528, lng: -6.3917, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Maxol Greenhills 193.9c / 218.9c
  { id: "maxol-ballymun",           name: "Maxol Ballymun",             lat: 53.3967, lng: -6.2644, type: "fuel", petrolEur: 1.939, dieselEur: 2.189, fuelTypes: "both" },
  // Circle K Fonthill (repeat band)
  { id: "circle-k-clonskeagh",      name: "Circle K Clonskeagh",        lat: 53.3047, lng: -6.2297, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Certa Express
  { id: "texaco-stillorgan",        name: "Texaco Stillorgan",          lat: 53.2914, lng: -6.1997, type: "fuel", petrolEur: 1.899, dieselEur: 2.129, fuelTypes: "both" },
  // Applegreen Crumlin
  { id: "applegreen-santry",        name: "Applegreen Santry",          lat: 53.4028, lng: -6.2486, type: "fuel", petrolEur: 1.919, dieselEur: 2.149, fuelTypes: "both" },
  // Maxol Cromwellsfort
  { id: "maxol-rathfarnham",        name: "Maxol Rathfarnham",          lat: 53.3006, lng: -6.2817, type: "fuel", petrolEur: 1.899, dieselEur: 2.139, fuelTypes: "both" },
  // Circle K St Peter's
  { id: "esso-dun-laoghaire",       name: "Esso Dun Laoghaire",         lat: 53.2944, lng: -6.1336, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Circle K Sundrive 199.9c / 228.9c
  { id: "circle-k-blackrock",       name: "Circle K Blackrock",         lat: 53.3014, lng: -6.1781, type: "fuel", petrolEur: 1.999, dieselEur: 2.289, fuelTypes: "both" },
  // Circle K Round Tower
  { id: "texaco-churchtown",        name: "Texaco Churchtown",          lat: 53.2997, lng: -6.2681, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Applegreen Celbridge Maynooth Rd 190.9c / 219.9c
  { id: "applegreen-m1-balbriggan", name: "Applegreen M1 Balbriggan",   lat: 53.6078, lng: -6.1842, type: "fuel", petrolEur: 1.909, dieselEur: 2.199, fuelTypes: "both" },
  // Circle K Fonthill
  { id: "circle-k-malahide",        name: "Circle K Malahide",          lat: 53.4500, lng: -6.1542, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
  // Maxol Greenhills
  { id: "maxol-howth",              name: "Maxol Howth",                lat: 53.3889, lng: -6.0669, type: "fuel", petrolEur: 1.939, dieselEur: 2.189, fuelTypes: "both" },
  // Certa
  { id: "texaco-portmarnock",       name: "Texaco Portmarnock",         lat: 53.4236, lng: -6.1392, type: "fuel", petrolEur: 1.899, dieselEur: 2.129, fuelTypes: "both" },
  // Circle K Round Tower Naas Rd
  { id: "applegreen-naas-road",     name: "Applegreen Naas Road",       lat: 53.3278, lng: -6.3856, type: "fuel", petrolEur: 1.919, dieselEur: 2.179, fuelTypes: "both" },
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

  let stations: Station[] = filtered.map((station) => {
    const petrol = station.petrolEur;
    const diesel = station.dieselEur;
    return {
      id: station.id,
      name: station.name,
      lat: station.lat,
      lng: station.lng,
      type: station.type,
      fuelTypes: station.fuelTypes,
      fuelPrices: { petrol, diesel },
      price_value: Math.min(petrol, diesel),
      price_label: `€${petrol.toFixed(2)} / €${diesel.toFixed(2)}`,
      distance_km: calculateDistanceKm(userLat, userLng, station.lat, station.lng),
    };
  });

  if (maxDistanceKm != null && maxDistanceKm > 0) {
    stations = stations.filter(
      (s) => s.distance_km != null && s.distance_km <= maxDistanceKm
    );
  }

  return stations;
}
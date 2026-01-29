// src/api/ukFuelOpenData.ts
export type UKFuelStation = {
  site_id?: string;
  brand?: string;
  name?: string;
  address?: string;
  postcode?: string;
  location?: { latitude: number; longitude: number };
  prices?: Record<string, number>; // pence per litre normally
};

function normalizeStationName(s: UKFuelStation) {
  return s.name || s.brand || "Fuel Station";
}

/**
 * Tries to handle the most common UK open-data formats.
 * Different retailers format slightly differently.
 */
export async function fetchUKFuelStationsFromRetailerUrl(
  retailerUrl: string
): Promise<UKFuelStation[]> {
  const res = await fetch(retailerUrl);
  if (!res.ok) return [];

  const data = await res.json();

  // Many retailers: { stations: [...] }
  if (data?.stations && Array.isArray(data.stations)) return data.stations;

  // Some retailers: { forecourts: [...] } etc
  if (data?.forecourts && Array.isArray(data.forecourts)) return data.forecourts;

  // Fallback: if it's already an array
  if (Array.isArray(data)) return data;

  return [];
}

// src/api/ukFuelOpenData.ts

export const fuelData = [
  {
    id: 1,
    name: "Circle K",
    latitude: 53.3498,
    longitude: -6.2603,
    price: 1.55,
  },
  {
    id: 2,
    name: "Shell",
    latitude: 53.347,
    longitude: -6.259,
    price: 1.59,
  },
];


export function pickPriceEuroPerL(station: UKFuelStation, fuelType: "diesel" | "unleaded") {
  // UK feeds are usually in pence per litre
  const prices = station.prices || {};
  const candidates =
    fuelType === "diesel"
      ? ["B7", "SDV", "diesel", "Diesel"]
      : ["E10", "E5", "unleaded", "Unleaded"];

  for (const key of candidates) {
    const v = prices[key];
    if (typeof v === "number") {
      // Convert “pence per litre” to “£ per litre” then to “€ per litre” (roughly)
      // For the prototype we keep it simple: treat numeric as “per litre”
      // You can improve this later if you want currency accuracy.
      return v / 100;
    }
  }
  return null;
}

export function toBasicFuelStation(st: UKFuelStation) {
  const lat = st.location?.latitude;
  const lng = st.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return {
    externalId: st.site_id ?? null,
    name: normalizeStationName(st),
    lat,
    lng,
    raw: st,
  };
}

// src/api/enrichStationsWithPrices.ts
// Enrich Google Places stations with community-submitted prices

import { supabase } from "../lib/supabaseClient";
import { maxIsoTimestamps } from "../lib/formatTimeAgo";
import type { Station } from "../types/station";

type GradeLatest = {
  price: number;
  at: string;
};

function normalizeStationKey(name: string): string {
  return name.trim().toLowerCase();
}

export async function enrichWithCommunityPrices(stations: Station[]): Promise<Station[]> {
  if (stations.length === 0) return stations;

  const stationNames = stations.map((station) => station.name);
  const uniqueNames = Array.from(new Set(stationNames));

  // Primary source: per-grade `price_reports` (what the app writes today).
  const { data: reportRows, error: reportsError } = await supabase
    .from("price_reports")
    .select("station_name, price, fuel_grade, created_at")
    .eq("station_type", "fuel")
    .in("station_name", uniqueNames)
    .order("created_at", { ascending: false });

  if (reportsError) {
    console.warn("price_reports enrich failed; falling back to legacy", reportsError);
  }

  const byName = new Map<string, { petrol?: GradeLatest; diesel?: GradeLatest }>();

  for (const row of (reportRows ?? []) as Array<{
    station_name: string;
    price: number | null;
    fuel_grade: string | null;
    created_at: string;
  }>) {
    if (typeof row.price !== "number" || !Number.isFinite(row.price)) continue;
    const key = normalizeStationKey(row.station_name);
    const g = row.fuel_grade;
    if (g !== "petrol" && g !== "diesel") continue;
    if (!byName.has(key)) byName.set(key, {});

    const entry = byName.get(key)!;
    if (g === "petrol" && !entry.petrol) {
      entry.petrol = { price: row.price, at: row.created_at };
    } else if (g === "diesel" && !entry.diesel) {
      entry.diesel = { price: row.price, at: row.created_at };
    }
  }

  // Legacy fallback: older community rows in `station_updates` (some projects still use this).
  const { data: legacyRows } = await supabase
    .from("station_updates")
    .select("station_name, new_price, created_at")
    .in("station_name", uniqueNames)
    .order("created_at", { ascending: false })
    .limit(1000);

  const legacyByName = new Map<string, { price: number; at: string }>();
  for (const row of legacyRows ?? []) {
    const key = normalizeStationKey(row.station_name);
    if (legacyByName.has(key)) continue;
    if (row.new_price == null || !Number.isFinite(row.new_price)) continue;
    legacyByName.set(key, { price: row.new_price, at: row.created_at });
  }

  return stations.map((station) => {
    if (station.type !== "fuel") return station;

    const key = normalizeStationKey(station.name);
    const g = byName.get(key);
    const legacy = legacyByName.get(key);

    const petrol = g?.petrol?.price;
    const diesel = g?.diesel?.price;
    const hasSplit = petrol != null || diesel != null;

    if (hasSplit) {
      const fuelPrices: NonNullable<Station["fuelPrices"]> = {
        petrol: petrol ?? null,
        diesel: diesel ?? null,
      };

      const reportedAt: NonNullable<Station["fuelPricesReportedAt"]> = {
        petrol: g?.petrol?.at,
        diesel: g?.diesel?.at,
      };

      const communityAt = maxIsoTimestamps(
        [g?.petrol?.at, g?.diesel?.at].filter((x): x is string => typeof x === "string")
      );

      const minPrice = [petrol, diesel].filter(
        (p): p is number => typeof p === "number" && Number.isFinite(p)
      );

      return {
        ...station,
        fuelPrices: fuelPrices,
        fuelPricesReportedAt: reportedAt,
        communityPriceUpdatedAt: communityAt,
        priceSource: "community" as const,
        price_value: minPrice.length > 0 ? Math.min(...minPrice) : station.price_value ?? null,
        price_label: null,
        typicalRetailFill: false,
      };
    }

    if (legacy) {
      // Legacy: single `new_price` without split grades; keep old behaviour.
      if (typeof legacy.price === "number" && Number.isFinite(legacy.price)) {
        return {
          ...station,
          price_value: legacy.price,
          price_label: `€${legacy.price.toFixed(2)}/L`,
          priceSource: "community" as const,
          communityPriceUpdatedAt: legacy.at,
          typicalRetailFill: false,
        };
      }
    }

    return station;
  });
}
// src/api/enrichStationsWithPrices.ts
// Enrich Google Places stations with community prices from `price_reports` (petrol + diesel).

import { supabase } from "../lib/supabaseClient";
import { maxIsoTimestamps } from "../lib/formatTimeAgo";
import type { Station } from "../types/station";

type ReportRow = {
  station_name: string;
  price: number;
  fuel_grade: FuelGradeDb | null;
  created_at: string;
};

type FuelGradeDb = "petrol" | "diesel";

type Latest = { price: number; at: string };

export async function enrichWithCommunityPrices(stations: Station[]): Promise<Station[]> {
  const { data: rows, error } = await supabase
    .from("price_reports")
    .select("station_name, price, fuel_grade, created_at")
    .eq("station_type", "fuel")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[enrichWithCommunityPrices]", error);
    return stations;
  }

  if (!rows?.length) return stations;

  const updates = rows as ReportRow[];

  const petrolLatest = new Map<string, Latest>();
  const dieselLatest = new Map<string, Latest>();

  for (const u of updates) {
    const name = u.station_name;
    const price = Number(u.price);
    if (!Number.isFinite(price)) continue;

    const at = u.created_at;
    const grade = u.fuel_grade;
    const entry: Latest = { price, at };

    // App always sends fuel_grade; skip legacy rows without it so one price is never copied to both grades.
    if (grade === null) {
      continue;
    }
    if (grade === "petrol") {
      if (!petrolLatest.has(name)) petrolLatest.set(name, entry);
    } else if (grade === "diesel") {
      if (!dieselLatest.has(name)) dieselLatest.set(name, entry);
    }
  }

  return stations.map((station) => {
    const p = petrolLatest.get(station.name);
    const d = dieselLatest.get(station.name);

    if (p == null && d == null) return station;

    const min = p != null && d != null ? Math.min(p.price, d.price) : p?.price ?? d?.price ?? null;

    const communityPriceUpdatedAt = maxIsoTimestamps(
      [p?.at, d?.at].filter((x): x is string => typeof x === "string")
    );

    const fuelPricesReportedAt = {
      ...(p?.at ? { petrol: p.at } : {}),
      ...(d?.at ? { diesel: d.at } : {}),
    };

    return {
      ...station,
      fuelPrices: { petrol: p?.price ?? null, diesel: d?.price ?? null },
      fuelPricesReportedAt,
      price_value: min ?? station.price_value,
      price_label: min != null ? `€${min.toFixed(2)}/L` : station.price_label,
      priceSource: "community" as const,
      communityPriceUpdatedAt,
    };
  });
}

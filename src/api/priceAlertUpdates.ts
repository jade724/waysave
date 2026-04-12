import { supabase } from "../lib/supabaseClient";

export type PriceUpdateRow = {
  station_name: string;
  new_price: number;
  fuel_grade: "petrol" | "diesel" | null;
  created_at: string;
};

/**
 * New community price rows from `price_reports` (fuel) after `sinceIso`.
 */
export async function fetchPriceUpdatesSince(
  stationNames: string[],
  sinceIso: string
): Promise<PriceUpdateRow[]> {
  if (stationNames.length === 0) return [];

  const { data, error } = await supabase
    .from("price_reports")
    .select("station_name, price, fuel_grade, created_at")
    .eq("station_type", "fuel")
    .in("station_name", stationNames)
    .gt("created_at", sinceIso)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const rows = (data ?? []) as Array<{
    station_name: string;
    price: number;
    fuel_grade: string | null;
    created_at: string;
  }>;

  return rows
    .filter((r) => typeof r.price === "number" && Number.isFinite(r.price))
    .map((r) => ({
      station_name: r.station_name,
      new_price: r.price,
      fuel_grade:
        r.fuel_grade === "petrol" || r.fuel_grade === "diesel" ? r.fuel_grade : null,
      created_at: r.created_at,
    }));
}

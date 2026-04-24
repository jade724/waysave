// src/api/enrichStationsWithPrices.ts
// Enrich Google Places stations with community-submitted prices

import { supabase } from "../lib/supabaseClient";
import type { Station } from "../App";

export async function enrichWithCommunityPrices(stations: Station[]): Promise<Station[]> {
  if (stations.length === 0) return stations;

  const stationNames = stations.map((station) => station.name);

  // Fetch only relevant recent updates instead of the full table.
  const { data: updates } = await supabase
    .from("station_updates")
    .select("station_name, new_price, created_at")
    .in("station_name", stationNames)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!updates) return stations;

  // Create map of latest prices by station name
  const priceMap = new Map<string, number>();
  
  updates.forEach((update) => {
    if (!priceMap.has(update.station_name)) {
      priceMap.set(update.station_name, update.new_price);
    }
  });

  // Enrich stations with community prices (if available)
  return stations.map((station) => {
    const communityPrice = priceMap.get(station.name);
    
    if (communityPrice) {
      return {
        ...station,
        price_value: communityPrice,
        price_label: `€${communityPrice.toFixed(2)}/L`,
        priceSource: "community" as const,
      };
    }
    
    return station;
  });
}
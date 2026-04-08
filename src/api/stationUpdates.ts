// src/api/stationUpdates.ts
import { supabase } from "../lib/supabaseClient";
import type { Station } from "../App";

export async function submitStationUpdate(args: {
  userId: string;
  station: Station;
  newPrice?: number | null;
  note?: string | null;
}) {
  const { userId, station, newPrice, note } = args;

  const payload = {
    user_id: userId,
    station_type: station.type,
    station_external_id: station.externalId ?? null,
    station_name: station.name,
    lat: station.lat,
    lng: station.lng,
    new_price: newPrice ?? null,
    note: note ?? null,
  };

  const { error } = await supabase.from("station_updates").insert(payload);
  if (error) throw error;
}

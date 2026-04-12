// Community price submissions — long-term home: `price_reports` (+ optional photo in Storage).

import { supabase } from "../lib/supabaseClient";
import type { FuelGrade } from "../lib/fuelPrices";
import type { Station } from "../types/station";

const BUCKET = "price-reports";

export async function uploadPriceReportPhoto(
  userId: string,
  fuelGrade: FuelGrade,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  const safeExt =
    ext && ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
  const path = `${userId}/${Date.now()}-${fuelGrade}.${safeExt}`;

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg",
    });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Could not get public URL for uploaded photo.");
  return data.publicUrl;
}

export async function submitPriceReport(args: {
  userId: string;
  station: Station;
  fuelGrade: FuelGrade;
  price: number;
  /** Optional pump / display photo — recommended for trust. */
  photoFile?: File | null;
}) {
  const { userId, station, fuelGrade, price, photoFile } = args;

  if (station.type !== "fuel") {
    throw new Error("Price reports with photos are only supported for fuel stations.");
  }

  let photoUrl: string | null = null;
  if (photoFile && photoFile.size > 0) {
    if (photoFile.size > 8 * 1024 * 1024) {
      throw new Error("Photo must be 8 MB or smaller.");
    }
    photoUrl = await uploadPriceReportPhoto(userId, fuelGrade, photoFile);
  }

  const payload = {
    reporter_id: userId,
    station_external_id: station.externalId ?? station.id,
    station_name: station.name,
    lat: station.lat,
    lng: station.lng,
    station_type: station.type,
    fuel_grade: fuelGrade,
    price,
    unit: "EUR/L",
    photo_url: photoUrl,
    status: "submitted",
  };

  const { error } = await supabase.from("price_reports").insert(payload);
  if (error) throw error;
}

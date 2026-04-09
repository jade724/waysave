// src/api/favorites.ts
// API functions for managing user's favorite stations

import { supabase } from "../lib/supabaseClient";
import { devError, devLog } from "../lib/logger";
import type { Station } from "../types/station";

/**
 * Fetch all favorite stations for the current user
 */
export async function fetchUserFavorites(userId: string): Promise<Station[]> {
  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    devError("Error fetching favorites:", error);
    throw error;
  }

  // Convert database format to Station format
  return (data || []).map((fav) => ({
    id: fav.station_id,
    externalId: fav.station_id,
    name: fav.station_name,
    lat: fav.station_lat,
    lng: fav.station_lng,
    type: fav.station_type as "fuel" | "ev",
    distance_km: undefined, // Will be calculated when needed
  }));
}

/**
 * Add a station to favorites
 */
export async function addFavorite(userId: string, station: Station): Promise<void> {
  const { error } = await supabase.from("favorites").insert({
    user_id: userId,
    station_id: station.id,
    station_name: station.name,
    station_type: station.type,
    station_lat: station.lat,
    station_lng: station.lng,
  });

  if (error) {
    // Ignore duplicate errors (already favorited)
    if (error.code === "23505") {
      devLog("Station already favorited");
      return;
    }
    devError("Error adding favorite:", error);
    throw error;
  }
}

/**
 * Remove a station from favorites
 */
export async function removeFavorite(userId: string, stationId: string): Promise<void> {
  const { error } = await supabase
    .from("favorites")
    .delete()
    .eq("user_id", userId)
    .eq("station_id", stationId);

  if (error) {
    devError("Error removing favorite:", error);
    throw error;
  }
}

/**
 * Check if a station is favorited
 */
export async function isFavorite(userId: string, stationId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .eq("user_id", userId)
    .eq("station_id", stationId)
    .maybeSingle();

  if (error) {
    devError("Error checking favorite:", error);
    return false;
  }

  return !!data;
}

/**
 * Get count of user's favorites
 */
export async function getFavoritesCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("favorites")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    devError("Error getting favorites count:", error);
    return 0;
  }

  return count || 0;
}
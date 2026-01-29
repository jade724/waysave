// src/api/fuelStations.ts

import type { Station } from "../App";
import { calculateDistanceKm } from "../lib/distance";
import { fuelData } from "./ukFuelOpenData";

const PRICE_WEIGHT = 10;

export function loadFuelStations(
  userLat: number,
  userLng: number
): Station[] {
  return fuelData.map((station: any) => {
    const lat = station.latitude;
    const lng = station.longitude;

    const distance = calculateDistanceKm(
      userLat,
      userLng,
      lat,
      lng
    );

    const price = Number(station.price);

    return {
      id: `fuel-${station.id}`,
      externalId: String(station.id),
      name: station.name,
      lat,
      lng,
      type: "fuel",
      price_value: Number.isFinite(price) ? price : null,
      price_label: Number.isFinite(price)
        ? `€${price.toFixed(2)}/L`
        : "Not available",
      distance_km: distance,
      score:
        Number.isFinite(price)
          ? distance + price * PRICE_WEIGHT
          : distance,
      raw: station,
    };
  });
}

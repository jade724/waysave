// src/types/station.ts

export interface Station {
  id: string;
  externalId?: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel" | "ev";

  distance_km?: number;
  score?: number;

  price_label?: string;
  price_value?: number | null;

  raw?: any;
}

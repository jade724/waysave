// Canonical station model (fuel + EV) used across the app.

export interface Station {
  id: string;
  externalId?: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel" | "ev";

  distance_km?: number;
  score?: number;

  driving_time_minutes?: number;
  driving_distance_km?: number;
  route_polyline?: string;

  price_label?: string | null;
  price_value?: number | null;
  priceSource?: "community";

  /** Optional Google Places / OCM payload for debugging or future use */
  raw?: unknown;

  address?: string;
  rating?: number;
  isOpen?: boolean;
  status?: string;
}

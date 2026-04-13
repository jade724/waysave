// Canonical station model (fuel + EV) used across the app.

export interface Station {
  id: string;
  externalId?: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel" | "ev";

  /** Fuel forecourts only — which fuels are sold (Google Places defaults to both). */
  fuelTypes?: "petrol" | "diesel" | "both";

  distance_km?: number;
  score?: number;

  driving_time_minutes?: number;
  driving_distance_km?: number;
  route_polyline?: string;

  price_label?: string | null;
  /** Single blended figure when only legacy data exists; prefer `fuelPrices` for fuel. */
  price_value?: number | null;
  /** Community €/L by grade when known (forecourts often differ petrol vs diesel). */
  fuelPrices?: {
    petrol?: number | null;
    diesel?: number | null;
  };
  /** ISO timestamps of the latest `price_reports` row per grade (for “reported” time per fuel). */
  fuelPricesReportedAt?: {
    petrol?: string;
    diesel?: string;
  };
  /** From latest `price_reports` when names match. */
  priceSource?: "community";
  /** True when petrol/diesel were filled from typical national retail (no community row). */
  typicalRetailFill?: boolean;
  /** Most recent community `price_reports.created_at` across grades (max of per-grade times). */
  communityPriceUpdatedAt?: string;

  /** EV: highest connector power from OCM (kW), for list cards. */
  evMaxPowerKw?: number | null;
  /**
   * EV: OCM free-text `UsageCost` when the operator reported it (often empty).
   * Not a guaranteed €/kWh — show as-is; detail screen has the full string.
   */
  evUsageCostHint?: string | null;
  /** EV: operator / network website from OCM `OperatorInfo.WebsiteURL` when present. */
  evOperatorWebsiteUrl?: string | null;

  /** Optional Google Places / OCM payload for debugging or future use */
  raw?: unknown;

  address?: string;
  rating?: number;
  isOpen?: boolean;
  status?: string;
}

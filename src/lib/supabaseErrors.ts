/** Map Supabase/PostgREST errors to short, actionable UI copy. */
/** Errors from `price_reports` insert or Storage upload. */
export function describeStationUpdateError(error: unknown): string {
  const raw =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: string }).message)
      : error instanceof Error
        ? error.message
        : String(error);

  const lower = raw.toLowerCase();

  if (
    lower.includes("price_reports") ||
    lower.includes("storage.objects") ||
    lower.includes("bucket")
  ) {
    return "Set up price_reports + Storage: run docs/price-reports-and-storage.sql in Supabase.";
  }

  if (
    lower.includes("fuel_grade") ||
    (lower.includes("column") &&
      (lower.includes("does not exist") || lower.includes("unknown")))
  ) {
    return "Database is missing a column. Run docs/price-reports-and-storage.sql (or legacy docs/supabase-station-updates.sql) in Supabase.";
  }

  if (
    lower.includes("station_type") ||
    lower.includes("station_external") ||
    (lower.includes("lat") && lower.includes("column")) ||
    (lower.includes("lng") && lower.includes("column"))
  ) {
    return "Database columns don’t match the app. Run docs/price-reports-and-storage.sql in Supabase.";
  }

  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("rls") ||
    (lower.includes("policy") && lower.includes("violat"))
  ) {
    return "Supabase blocked the insert. Add INSERT/SELECT policies — see docs/price-reports-and-storage.sql.";
  }

  if (lower.includes("jwt") || lower.includes("not authorized")) {
    return "Session expired — sign in again and retry.";
  }

  return raw.length > 160 ? `${raw.slice(0, 157)}…` : raw;
}

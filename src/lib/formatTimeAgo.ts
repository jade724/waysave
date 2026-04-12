/** Human-readable relative time for ISO timestamps (community updates, OCM dates). */
export function formatTimeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diffMs)) return "—";
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks} wk ago`;
}

export function maxIsoTimestamps(dates: string[]): string | undefined {
  if (dates.length === 0) return undefined;
  return dates.reduce((a, b) => (a > b ? a : b));
}

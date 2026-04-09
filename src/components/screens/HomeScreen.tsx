// src/components/screens/HomeScreen.tsx

import {
  ChevronRight,
  Heart,
  Lightbulb,
  Map,
  Navigation,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  Zap,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../../lib/authContext";
import type { UserPreferences } from "../../lib/preferences";

interface Props {
  onOpenMap: () => void;
  onOpenFilters: () => void;
  onOpenFavorites: () => void;
  /** Shown as a status strip when provided (keeps home in sync with map filters). */
  prefs?: UserPreferences;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function displayName(user: ReturnType<typeof useAuth>["user"]) {
  const full = user?.user_metadata?.full_name as string | undefined;
  if (full?.trim()) {
    const first = full.trim().split(/\s+/)[0];
    return first.length > 18 ? `${first.slice(0, 16)}…` : first;
  }
  const email = user?.email;
  if (email) {
    const local = email.split("@")[0];
    return local.length > 20 ? `${local.slice(0, 18)}…` : local;
  }
  return "there";
}

function prefsSummary(p: UserPreferences): string {
  const tab = p.activeTab === "fuel" ? "Fuel" : "EV";
  const dist =
    p.maxDistanceKm > 0
      ? `${p.maxDistanceKm < 10 ? p.maxDistanceKm.toFixed(1) : Math.round(p.maxDistanceKm)} km radius`
      : "Any distance";
  const sort =
    p.preference === "nearest"
      ? "Nearest"
      : p.preference === "cheapest"
        ? "Best value"
        : "Fastest route";
  return `${tab} · ${dist} · ${sort}`;
}

export default function HomeScreen({
  onOpenMap,
  onOpenFilters,
  onOpenFavorites,
  prefs,
}: Props) {
  const { user } = useAuth();

  const greeting = useMemo(() => getGreeting(), []);
  const name = useMemo(() => displayName(user), [user]);
  const summaryLine = prefs ? prefsSummary(prefs) : null;

  return (
    <div className="relative w-full h-full bg-[#0D0F14] overflow-y-auto text-white pb-28">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0 overflow-hidden opacity-90"
        aria-hidden
      >
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-[#00E0C6]/12 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-64 w-64 rounded-full bg-[#0097FF]/10 blur-3xl" />
        <div className="absolute bottom-32 right-0 h-48 w-48 rounded-full bg-emerald-500/8 blur-3xl" />
      </div>

      <div className="relative px-5 pt-6 sm:px-6">
        {/* Brand + greeting */}
        <header className="animate-[fadeIn_0.45s_ease-out] mb-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00E0C6]/90 mb-2">
                WaySave
              </p>
              <h1 className="text-[1.65rem] font-bold tracking-tight leading-tight">
                {greeting},
                <span className="block mt-1 bg-gradient-to-r from-white via-white to-white/75 bg-clip-text text-transparent">
                  {name}
                </span>
              </h1>
              <p className="text-white/45 text-sm mt-2 max-w-[280px] leading-relaxed">
                Compare fuel and EV stops near you—then open the map to navigate.
              </p>
            </div>
            <div
              className="shrink-0 flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.04] shadow-[0_0_24px_-8px_rgba(0,224,198,0.35)]"
              aria-hidden
            >
              <Sparkles className="h-6 w-6 text-[#00E0C6]" />
            </div>
          </div>

          {summaryLine && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/65">
                <span className="h-1.5 w-1.5 rounded-full bg-[#00E0C6] shadow-[0_0_8px_rgba(0,224,198,0.8)]" />
                {summaryLine}
              </span>
            </div>
          )}
        </header>

        {/* Primary CTA */}
        <section className="mb-5 animate-[fadeIn_0.5s_ease-out_0.05s_both]">
          <button
            type="button"
            onClick={onOpenMap}
            className="group relative w-full overflow-hidden rounded-[1.35rem] text-left transition active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#00E0C6] via-[#00c4e8] to-[#0097FF] opacity-100 transition group-hover:opacity-95" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2280%22%20height=%2280%22%20viewBox=%220%200%2080%2080%22%3E%3Ccircle%20cx=%2240%22%20cy=%2240%22%20r=%2236%22%20fill=%22none%22%20stroke=%22%23fff%22%20stroke-opacity=%220.06%22%20stroke-width=%221%22/%3E%3C/svg%3E')] opacity-40" />
            <div className="relative flex items-center gap-4 px-5 py-5">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0D0F14]/15 backdrop-blur-sm border border-[#0D0F14]/10">
                <Navigation className="h-7 w-7 text-[#0D0F14]" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#0D0F14] font-bold text-lg leading-tight">
                  Open map
                </p>
                <p className="text-[#0D0F14]/75 text-sm mt-0.5 font-medium">
                  Stations, routes, and live traffic
                </p>
              </div>
              <ChevronRight className="h-6 w-6 shrink-0 text-[#0D0F14]/50 transition group-hover:translate-x-0.5" />
            </div>
          </button>
        </section>

        {/* Secondary actions */}
        <section
          className="grid grid-cols-2 gap-3 mb-8 animate-[fadeIn_0.55s_ease-out_0.1s_both]"
          aria-label="Shortcuts"
        >
          <button
            type="button"
            onClick={onOpenFilters}
            className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] hover:border-white/[0.12] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E0C6]/20 to-[#0097FF]/15 border border-white/[0.06]">
              <SlidersHorizontal className="h-5 w-5 text-[#00E0C6]" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white/95">Filters</p>
              <p className="text-[11px] text-white/45 mt-0.5 leading-snug">
                Distance, fuel type, EV plugs
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onOpenFavorites}
            className="flex flex-col items-start gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] hover:border-white/[0.12] active:scale-[0.98]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/25 to-orange-600/20 border border-white/[0.06]">
              <Heart className="h-5 w-5 text-amber-200/95" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white/95">Favourites</p>
              <p className="text-[11px] text-white/45 mt-0.5 leading-snug">
                Saved stations
              </p>
            </div>
          </button>
        </section>

        {/* Highlights — scannable rows */}
        <section className="mb-6 animate-[fadeIn_0.6s_ease-out_0.12s_both]">
          <h2 className="text-[13px] font-semibold text-white/55 uppercase tracking-wider mb-3 px-0.5">
            What you can do
          </h2>
          <ul className="space-y-2">
            <li>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#12151c]/80 backdrop-blur-sm px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#00E0C6] to-[#0097FF]">
                  <Map className="h-[18px] w-[18px] text-[#0D0F14]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Live map</p>
                  <p className="text-xs text-white/45 mt-0.5">
                    Pins for fuel and chargers near you
                  </p>
                </div>
              </div>
            </li>
            <li>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#12151c]/80 backdrop-blur-sm px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600">
                  <TrendingDown className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">Smarter ranking</p>
                  <p className="text-xs text-white/45 mt-0.5">
                    Balance price, distance, and route time
                  </p>
                </div>
              </div>
            </li>
            <li>
              <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-[#12151c]/80 backdrop-blur-sm px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600">
                  <Zap className="h-[18px] w-[18px] text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">EV charging</p>
                  <p className="text-xs text-white/45 mt-0.5">
                    Filter by connector types you need
                  </p>
                </div>
              </div>
            </li>
          </ul>
        </section>

        {/* Tip */}
        <section className="animate-[fadeIn_0.65s_ease-out_0.15s_both]">
          <div className="rounded-2xl border border-[#00E0C6]/20 bg-gradient-to-br from-[#00E0C6]/[0.07] to-[#0097FF]/[0.05] p-4 flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00E0C6]/15 border border-[#00E0C6]/25">
              <Lightbulb className="h-5 w-5 text-[#00E0C6]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90">Tip</p>
              <p className="text-xs text-white/55 leading-relaxed mt-1">
                Allow location access for accurate distances. Use{" "}
                <span className="text-white/75 font-medium">Filters</span> to
                set max distance and sort order before you drive.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

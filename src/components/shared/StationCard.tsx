import { ChevronRight, Fuel, MapPin, Sparkles, Zap } from "lucide-react";
import type { Station } from "../../types/station";
import type { UserPreferences } from "../../lib/preferences";

interface Props {
  station: Station;
  index: number;
  prefs: UserPreferences;
  onPress: () => void;
}

export default function StationCard({
  station,
  index,
  prefs,
  onPress,
}: Props) {
  const isEV = station.type === "ev";
  const isBestValue = index === 0 && prefs.preference === "cheapest";
  const accent = isEV
    ? { ring: "ring-emerald-500/25", iconBg: "bg-emerald-500/12", iconText: "text-emerald-400", bar: "from-emerald-500/80" }
    : { ring: "ring-cyan-500/20", iconBg: "bg-cyan-500/12", iconText: "text-cyan-400", bar: "from-cyan-500/80" };

  return (
    <button
      type="button"
      onClick={onPress}
      className={`
        group relative w-full text-left overflow-hidden
        rounded-2xl min-h-[4.75rem] pl-4 pr-3 py-3.5
        bg-[#12151c]/90 backdrop-blur-sm
        border border-white/[0.07]
        shadow-[0_8px_32px_-12px_rgba(0,0,0,0.65)]
        transition-all duration-200
        hover:border-white/15 hover:bg-[#151a24]/95
        active:scale-[0.99]
        focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0D0F14]
        ${isBestValue ? `ring-1 ${accent.ring}` : ""}
      `}
    >
      {/* Left accent */}
      <span
        className={`pointer-events-none absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-gradient-to-b ${accent.bar} to-transparent opacity-90`}
        aria-hidden
      />

      <div className="flex items-stretch gap-3 pl-1">
        {/* Rank + icon */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
          <span
            className={`
              flex h-6 min-w-[1.5rem] items-center justify-center rounded-lg px-1.5
              text-[10px] font-bold tabular-nums
              ${index === 0 ? "bg-white/10 text-white" : "bg-white/[0.04] text-white/45"}
            `}
            aria-label={`Rank ${index + 1}`}
          >
            {index + 1}
          </span>
          <div
            className={`
              flex h-11 w-11 items-center justify-center rounded-xl
              ${accent.iconBg} ${accent.iconText}
              shadow-inner
              group-hover:scale-105 transition-transform duration-200
            `}
          >
            {isEV ? <Zap className="w-[1.15rem] h-[1.15rem]" strokeWidth={2.25} /> : <Fuel className="w-[1.15rem] h-[1.15rem]" strokeWidth={2.25} />}
          </div>
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1 flex flex-col justify-center gap-1 pr-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-white font-semibold text-[15px] leading-snug line-clamp-2 group-hover:text-white/95">
              {station.name}
            </p>
            <ChevronRight
              className="w-5 h-5 shrink-0 text-white/25 group-hover:text-white/45 transition-colors mt-0.5"
              aria-hidden
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <MapPin className="w-3.5 h-3.5 text-white/35" aria-hidden />
              {station.distance_km != null ? `${station.distance_km.toFixed(1)} km` : "—"}
            </span>
            {isEV && (
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/95">
                EV
              </span>
            )}
            {isBestValue && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300/95">
                <Sparkles className="w-3 h-3" aria-hidden />
                Best value
              </span>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="shrink-0 flex flex-col items-end justify-center gap-0.5 min-w-[4.25rem]">
          {!isEV && station.price_value != null && (
            <>
              <p className="text-lg font-bold tabular-nums text-[#5eead4] leading-none">
                €{station.price_value.toFixed(2)}
              </p>
              <p className="text-[10px] text-white/35 font-medium">per litre</p>
              {station.priceSource === "community" && (
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#00E0C6]/80">
                  Community
                </span>
              )}
            </>
          )}
          {isEV && (
            <span className="text-[11px] text-white/35 text-right leading-tight max-w-[5rem]">
              Tap for details
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

import { ChevronRight, Fuel, MapPin, Sparkles, Zap } from "lucide-react";
import type { Station } from "../../types/station";
import { formatTimeAgo } from "../../lib/formatTimeAgo";
import { effectiveFuelPriceEurPerL, formatIrelandPumpCentsPerL } from "../../lib/fuelPrices";
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
  const fp = station.fuelPrices;
  const listPrice =
    !isEV && station.type === "fuel"
      ? effectiveFuelPriceEurPerL(station, prefs.fuelType)
      : null;
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
            {isEV && station.evMaxPowerKw != null && station.evMaxPowerKw > 0 && (
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-300/95">
                ≤ {Math.round(station.evMaxPowerKw)} kW
              </span>
            )}
            {isEV && (station.evMaxPowerKw == null || station.evMaxPowerKw <= 0) && (
              <span className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-400/95">
                EV
              </span>
            )}
            {!isEV && station.isOpen === true && (
              <span className="rounded-md bg-emerald-500/8 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400/90">
                Open
              </span>
            )}
            {!isEV && station.isOpen === false && (
              <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-medium text-white/35">
                Closed?
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

        {/* Price — petrol & diesel may differ */}
        <div className="shrink-0 flex flex-col items-end justify-center gap-0.5 min-w-[4.5rem]">
          {!isEV && fp?.petrol != null && fp?.diesel != null && (
            <>
              <div className="text-right leading-tight">
                <p className="text-[10px] text-white/40 font-medium uppercase tracking-wide">
                  P / D
                </p>
                <p
                  className="text-base font-bold tabular-nums text-[#5eead4]"
                  title={`€${fp.petrol.toFixed(3)}/L petrol · €${fp.diesel.toFixed(3)}/L diesel`}
                >
                  {formatIrelandPumpCentsPerL(fp.petrol)} · {formatIrelandPumpCentsPerL(fp.diesel)}
                  <span className="text-[10px] font-semibold text-white/40"> c/L</span>
                </p>
              </div>
              <p className="text-[10px] text-white/35 font-medium">per litre</p>
              {station.priceSource === "community" && (
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#00E0C6]/80">
                  Community
                </span>
              )}
              {station.priceSource === "community" && station.communityPriceUpdatedAt && (
                <span className="text-[9px] text-white/30 tabular-nums">
                  {formatTimeAgo(station.communityPriceUpdatedAt)}
                </span>
              )}
              {station.typicalRetailFill && (
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/40">
                  Typical range
                </span>
              )}
            </>
          )}
          {!isEV && (fp?.petrol == null || fp?.diesel == null) && listPrice != null && (
            <>
              <p
                className="text-lg font-bold tabular-nums text-[#5eead4] leading-none"
                title={`€${listPrice.toFixed(3)}/L`}
              >
                {formatIrelandPumpCentsPerL(listPrice)}
                <span className="text-[11px] font-semibold text-white/40"> c/L</span>
              </p>
              <p className="text-[10px] text-white/35 font-medium">per litre</p>
              {station.priceSource === "community" && (
                <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#00E0C6]/80">
                  Community
                </span>
              )}
              {station.priceSource === "community" && station.communityPriceUpdatedAt && (
                <span className="text-[9px] text-white/30 tabular-nums">
                  {formatTimeAgo(station.communityPriceUpdatedAt)}
                </span>
              )}
            </>
          )}
          {isEV && (
            <div className="text-right max-w-[6.5rem] min-w-0">
              {station.evUsageCostHint ? (
                <p
                  className="text-[10px] text-emerald-300/90 leading-snug line-clamp-3"
                  title={station.evUsageCostHint}
                >
                  {station.evUsageCostHint}
                </p>
              ) : (
                <span className="text-[11px] text-white/35 leading-tight">
                  Tap for power & pricing
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// src/components/shared/StationCard.tsx

import { Fuel, Zap, Navigation } from "lucide-react";
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
  const isBestValue =
    index === 0 && prefs.preference === "cheapest";

  return (
    <button
      onClick={onPress}
      className={`
        w-full text-left
        rounded-2xl p-4
        bg-gradient-to-b from-[#171B28] to-[#0D0F14]
        border border-white/10
        transition-all duration-200
        active:scale-[0.98]
        ${
          isBestValue
            ? "ring-2 ring-emerald-400/40 shadow-lg shadow-emerald-500/20"
            : "hover:border-white/20"
        }
      `}
    >
      <div className="flex items-center justify-between gap-4">
        {/* LEFT */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Icon */}
          <div
            className={`
              w-12 h-12 rounded-xl
              flex items-center justify-center shrink-0
              ${
                isEV
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-cyan-500/15 text-cyan-400"
              }
            `}
          >
            {isEV ? <Zap size={20} /> : <Fuel size={20} />}
          </div>

          {/* Name + distance */}
          <div className="min-w-0">
            <p className="text-white font-medium truncate">
              {station.name}
            </p>

            <div className="flex items-center gap-1 text-white/50 text-xs mt-1">
              <Navigation size={12} />
              {station.distance_km?.toFixed(1)} km away
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="text-right shrink-0">
          {!isEV && station.price_value != null && (
            <p className="text-cyan-400 font-semibold text-sm">
              €{station.price_value.toFixed(2)}/L
            </p>
          )}

          {isEV && (
            <span className="text-emerald-400 text-xs font-semibold">
              EV
            </span>
          )}

          {isBestValue && (
            <span
              className="
                inline-block mt-1
                text-[10px] font-semibold
                text-emerald-400
                bg-emerald-400/10
                px-2 py-0.5 rounded-full
              "
            >
              Best value
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// src/components/shared/StationCard.tsx

import { Fuel, Zap, Navigation } from "lucide-react";
import type { UserPreferences } from "../../lib/preferences";

import type { Station } from "../../App";

interface Props {
  station: Station;
  index: number;
  prefs: UserPreferences;
  onPress: () => void;
  highlight?: boolean;
}

export default function StationCard({
  station,
  onPress,
  highlight = false,
}: Props) {
  return (
    <button
      onClick={onPress}
      className={`
        w-full rounded-2xl border p-4
        flex items-start justify-between
        bg-[#14161d] transition
        ${highlight ? "border-[#00E0C6]" : "border-white/10"}
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-[#0D0F14] border border-white/15 flex items-center justify-center">
          {station.type === "fuel" ? (
            <Fuel className="w-5 h-5 text-[#00E0C6]" />
          ) : (
            <Zap className="w-5 h-5 text-[#00E0C6]" />
          )}
        </div>

        {/* Text */}
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-medium truncate max-w-[180px]">
              {station.name}
            </h3>

            {highlight && (
              <span className="px-2 py-0.5 text-[10px] rounded-xl bg-[#00E0C6]/15 text-[#00E0C6]">
                Best value
              </span>
            )}
          </div>

          <div className="flex items-center text-white/50 text-xs gap-2 mt-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {station.distance_km != null
                ? `${station.distance_km.toFixed(1)} km`
                : "Distance unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-[#00E0C6] text-sm font-semibold">
        {station.type === "fuel"
          ? station.price_label ?? "N/A"
          : "EV"}
      </div>
    </button>
  );
}

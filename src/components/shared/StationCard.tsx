// src/shared/StationCard.tsx

import { Fuel, Zap, Navigation } from "lucide-react";
import type { Station } from "../../App";

interface StationCardProps {
  station: Station;
  onPress: () => void;
  highlight?: boolean;
}

export default function StationCard({ station, onPress }: StationCardProps) {
  return (
    <button
      onClick={onPress}
      className="
        station-press
        w-full bg-[#14161d]
        rounded-2xl border border-white/10
        p-4 flex items-start justify-between
        hover:border-white/25
        transition
        shadow-[0_10px_30px_rgba(0,0,0,0.7)]
      "
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className="
            w-12 h-12 rounded-2xl
            bg-[#0D0F14] border border-white/15
            flex items-center justify-center
          "
        >
          {station.type === "fuel" ? (
            <Fuel className="w-5 h-5 text-[#00E0C6]" />
          ) : (
            <Zap className="w-5 h-5 text-[#00E0C6]" />
          )}
        </div>

        {/* Text */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-white text-sm font-medium">{station.name}</h3>
            {station.type === "fuel" && (
              <span
                className="
                  px-2 py-0.5 text-[10px]
                  rounded-xl border border-[#00E0C6]/40
                  text-[#00E0C6] bg-[#00E0C6]/15
                "
              >
                Best value
              </span>
            )}
          </div>

          <div className="flex items-center text-white/50 text-xs gap-2">
            <Navigation className="w-3.5 h-3.5" />
            <span>
              {station.distance
                ? `${station.distance.toFixed?.(1) ?? station.distance} km`
                : "Distance unknown"}
            </span>
            {station.detour && (
              <>
                <span>•</span>
                <span>{station.detour}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="text-right text-[#00E0C6] text-lg font-semibold">
        {station.price ?? (station.type === "ev" ? "EV" : "")}
      </div>
    </button>
  );
}

// src/components/map/DirectionsPanel.tsx

import { Navigation, X, MapPin, Clock } from "lucide-react";
import type { RouteInfo } from "./GoogleMapBackground";

interface Props {
  routeInfo: RouteInfo | null;
  stationName: string;
  onClose: () => void;
}

// Strip HTML from Google's instructions
function stripHtml(html: string): string {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
}

// Get direction icon based on maneuver type
function getDirectionIcon(maneuver?: string): string {
  if (!maneuver) return "→";
  
  const icons: Record<string, string> = {
    "turn-left": "↰",
    "turn-right": "↱",
    "turn-slight-left": "↖",
    "turn-slight-right": "↗",
    "turn-sharp-left": "⤺",
    "turn-sharp-right": "⤻",
    "uturn-left": "↶",
    "uturn-right": "↷",
    "merge": "⛙",
    "roundabout-left": "⭯",
    "roundabout-right": "⭮",
    "straight": "↑",
  };

  return icons[maneuver] || "→";
}

export default function DirectionsPanel({
  routeInfo,
  stationName,
  onClose,
}: Props) {
  if (!routeInfo) return null;

  return (
    <div className="w-full h-full bg-[#0D0F14]/98 backdrop-blur-xl flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-white/10 px-4 py-4 flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Navigation className="w-5 h-5 text-[#00E0C6]" />
            <h2 className="text-white font-bold text-lg">Directions</h2>
          </div>
          <p className="text-white/60 text-sm">To {stationName}</p>
        </div>
        
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition"
          aria-label="Close directions"
        >
          <X className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {/* Route Summary */}
      <div className="flex-shrink-0 px-4 py-4 border-b border-white/10 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-[#00E0C6]" />
              <p className="text-white/60 text-xs">Distance</p>
            </div>
            <p className="text-white font-bold text-lg">{routeInfo.distance}</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-400" />
              <p className="text-white/60 text-xs">Duration</p>
            </div>
            <p className="text-white font-bold text-lg">{routeInfo.duration}</p>
          </div>
        </div>

        <p className="text-white/45 text-xs text-center">
          Use <span className="text-white/70">Route options</span> on the map to switch between alternatives.
        </p>
      </div>

      {/* Turn-by-turn directions */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="space-y-2">
          {routeInfo.steps.map((step, index) => (
            <div
              key={index}
              className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 transition"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center text-[#0D0F14] font-bold text-sm">
                  {index + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-2xl flex-shrink-0 mt-0.5">
                      {getDirectionIcon(step.maneuver)}
                    </span>
                    <p className="text-white text-sm leading-relaxed">
                      {stripHtml(step.instructions)}
                    </p>
                  </div>

                  <p className="text-white/50 text-xs">
                    {step.distance?.text}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Final destination */}
          <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold">Arrival</p>
                <p className="text-white/60 text-sm">{stationName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-white/10 px-4 py-3">
        <p className="text-white/40 text-xs text-center">
          Directions provided by Google Maps • Traffic conditions may vary
        </p>
      </div>
    </div>
  );
}
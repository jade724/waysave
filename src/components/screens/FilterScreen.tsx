// src/components/screens/FilterScreen.tsx

import { X, Fuel, Zap, RotateCcw, Check } from "lucide-react";
import { useMemo, useState } from "react";
import type { FuelTypeFilter, UserPreferences } from "../../lib/preferences";

// Props tell this screen what the current preferences are and
// provide callbacks for saving and closing.
interface FilterScreenProps {
  initial: UserPreferences;
  onApply: (next: UserPreferences) => void;
  onClose: () => void;
}

export default function FilterScreen({
  initial,
  onApply,
  onClose,
}: FilterScreenProps) {
  // Local component state starts from `initial` preferences.
  const [fuelType, setFuelType] = useState<FuelTypeFilter>(initial.fuelType);
  const [connectors, setConnectors] = useState(initial.connectors);
  const [preference, setPreference] = useState(initial.preference);
  const [priceSensitivity, setPriceSensitivity] = useState(
    initial.priceSensitivity
  );
  const [maxDistance, setMaxDistance] = useState(initial.maxDistanceKm);

  // Check if any changes were made
  const hasChanges = useMemo(() => {
    return (
      fuelType !== initial.fuelType ||
      JSON.stringify(connectors) !== JSON.stringify(initial.connectors) ||
      preference !== initial.preference ||
      priceSensitivity !== initial.priceSensitivity ||
      maxDistance !== initial.maxDistanceKm
    );
  }, [fuelType, connectors, preference, priceSensitivity, maxDistance, initial]);

  // Flip a connector option on/off by key.
  const toggleConnector = (key: keyof typeof connectors) => {
    setConnectors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Build the next preferences object and send it up to the parent.
  const applyFilters = () => {
    onApply({
      ...initial,
      fuelType,
      connectors,
      preference,
      priceSensitivity,
      maxDistanceKm: maxDistance,
    });
    onClose();
  };

  // Reset all local fields back to the original values.
  const resetToDefaults = () => {
    setFuelType(initial.fuelType);
    setConnectors(initial.connectors);
    setPreference(initial.preference);
    setPriceSensitivity(initial.priceSensitivity);
    setMaxDistance(initial.maxDistanceKm);
  };

  // Memoized label for distance
  const distanceLabel = useMemo(() => {
    if (maxDistance < 0.1) return "0.0 km";
    return `${maxDistance.toFixed(1)} km`;
  }, [maxDistance]);

  return (
    <div className="relative w-full h-full bg-[#0D0F14] flex flex-col">
      {/* ---------- HEADER ---------- */}
      <div className="sticky top-0 z-40 bg-[#0D0F14]/90 backdrop-blur-md border-b border-white/5 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="
              w-9 h-9 rounded-full 
              bg-white/5 border border-white/10 
              flex items-center justify-center 
              hover:bg-white/10 transition
            "
            aria-label="Close"
          >
            <X className="w-5 h-5 text-white/80" />
          </button>

          <h1 className="text-white font-bold text-lg">Filters</h1>

          <button
            onClick={resetToDefaults}
            disabled={!hasChanges}
            className="
              w-9 h-9 rounded-full 
              bg-white/5 border border-white/10 
              flex items-center justify-center 
              hover:bg-white/10 transition
              disabled:opacity-40 disabled:cursor-not-allowed
            "
            aria-label="Reset"
            title="Reset to original"
          >
            <RotateCcw className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>

      {/* ---------- CONTENT ---------- */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="space-y-6 pt-6">
          
          {/* Search Preference */}
          <div>
            <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
              <span className="text-sm">Search Preference</span>
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(["nearest", "cheapest", "fastest"] as const).map((pref) => (
                <button
                  key={pref}
                  onClick={() => setPreference(pref)}
                  className={`
                    py-3 px-2 rounded-2xl font-semibold text-xs
                    transition capitalize
                    ${
                      preference === pref
                        ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    }
                  `}
                >
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* Max Distance */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/80 font-semibold text-sm">
                Max Distance
              </h2>
              <span className="text-[#00E0C6] font-bold text-sm">
                {distanceLabel}
              </span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="0.1"
                max="100"
                step="0.1"
                value={maxDistance}
                onChange={(e) => setMaxDistance(parseFloat(e.target.value))}
                className="
                  w-full h-2 rounded-full appearance-none cursor-pointer
                  bg-white/10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-r
                  [&::-webkit-slider-thumb]:from-[#00E0C6]
                  [&::-webkit-slider-thumb]:to-[#0097FF]
                  [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,224,198,0.5)]
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-moz-range-thumb]:w-5
                  [&::-moz-range-thumb]:h-5
                  [&::-moz-range-thumb]:rounded-full
                  [&::-moz-range-thumb]:bg-gradient-to-r
                  [&::-moz-range-thumb]:from-[#00E0C6]
                  [&::-moz-range-thumb]:to-[#0097FF]
                  [&::-moz-range-thumb]:border-0
                  [&::-moz-range-thumb]:cursor-pointer
                "
              />
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>0.1 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>

          {/* Fuel Type Filter */}
          <div>
            <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              <span className="text-sm">Fuel Type</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: null, label: "Any" },
                { value: "petrol", label: "Petrol" },
                { value: "diesel", label: "Diesel" },
                { value: "both", label: "Both" },
              ] as const).map((option) => (
                <button
                  key={option.label}
                  onClick={() => setFuelType(option.value )}
                  className={`
                    py-3 px-4 rounded-2xl font-semibold text-sm
                    transition flex items-center justify-center gap-2
                    ${
                      fuelType === option.value
                        ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
                        : "bg-white/5 border border-white/10 text-white/60 hover:bg-white/10"
                    }
                  `}
                >
                  {fuelType === option.value && (
                    <Check className="w-4 h-4" />
                  )}
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* EV Connectors */}
          <div>
            <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4" />
              <span className="text-sm">EV Connectors</span>
            </h2>
            <div className="space-y-2">
              {Object.entries(connectors).map(([key, enabled]) => (
                <button
                  key={key}
                  role="switch"
                  aria-checked={enabled}
                  onClick={() => toggleConnector(key as keyof typeof connectors)}
                  className={`
                    w-full p-4 rounded-2xl
                    transition flex items-center justify-between
                    ${
                      enabled
                        ? "bg-gradient-to-r from-[#00E0C6]/20 to-[#0097FF]/20 border border-[#00E0C6]/30"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }
                  `}
                >
                  <span className={`font-semibold text-sm uppercase ${
                    enabled ? "text-[#00E0C6]" : "text-white/60"
                  }`}>
                    {key}
                  </span>
                  <div className={`
                    w-11 h-6 rounded-full transition relative
                    ${enabled ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]" : "bg-white/20"}
                  `}>
                    <div className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white
                      transition-all shadow-lg
                      ${enabled ? "left-6" : "left-1"}
                    `} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Sensitivity */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/80 font-semibold text-sm">
                Price Sensitivity
              </h2>
              <span className="text-[#00E0C6] font-bold text-sm">
                {Math.round(priceSensitivity * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={priceSensitivity}
              onChange={(e) => setPriceSensitivity(parseFloat(e.target.value))}
              className="
                w-full h-2 rounded-full appearance-none cursor-pointer
                bg-white/10
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-gradient-to-r
                [&::-webkit-slider-thumb]:from-[#00E0C6]
                [&::-webkit-slider-thumb]:to-[#0097FF]
                [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(0,224,198,0.5)]
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-5
                [&::-moz-range-thumb]:h-5
                [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-gradient-to-r
                [&::-moz-range-thumb]:from-[#00E0C6]
                [&::-moz-range-thumb]:to-[#0097FF]
                [&::-moz-range-thumb]:border-0
                [&::-moz-range-thumb]:cursor-pointer
              "
            />
            <div className="flex justify-between text-xs text-white/40 mt-2">
              <span>Low</span>
              <span>High</span>
            </div>
          </div>

          {/* Info Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20">
            <p className="text-xs text-white/60 leading-relaxed">
              💡 <strong className="text-white/80">Tip:</strong> Higher price sensitivity 
              prioritizes cheaper stations even if they're further away.
            </p>
          </div>
        </div>
      </div>

      {/* ---------- FOOTER (Apply Button) ---------- */}
      <div className="sticky bottom-0 z-40 bg-[#0D0F14]/90 backdrop-blur-md border-t border-white/5 px-6 py-4">
        <button
          onClick={applyFilters}
          disabled={!hasChanges}
          className="
            w-full py-4 rounded-2xl font-bold
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14]
            shadow-[0_0_20px_rgba(0,224,198,0.35)]
            active:scale-95 transition
            disabled:opacity-50 disabled:cursor-not-allowed
            disabled:active:scale-100
            flex items-center justify-center gap-2
          "
        >
          {hasChanges ? (
            <>
              <Check className="w-5 h-5" />
              Apply Filters
            </>
          ) : (
            "No Changes"
          )}
        </button>
      </div>
    </div>
  );
}
// src/components/screens/FilterScreen.tsx

import { X, Fuel, Zap, RotateCcw, Check } from "lucide-react";
import { useMemo, useState } from "react";
import {
  EV_FILTER_MAX_KW,
  type FuelTypeFilter,
  type UserPreferences,
} from "../../lib/preferences";

interface FilterScreenProps {
  /** Default tab — usually the map’s Fuel / EV tab (`prefs.activeTab`). */
  mode: "fuel" | "ev";
  initial: UserPreferences;
  onApply: (next: UserPreferences) => void;
  onClose: () => void;
}

export default function FilterScreen({
  mode,
  initial,
  onApply,
  onClose,
}: FilterScreenProps) {
  const [screenMode, setScreenMode] = useState<"fuel" | "ev">(mode);

  const [fuelType, setFuelType] = useState<FuelTypeFilter>(initial.fuelType);
  const [connectors, setConnectors] = useState(initial.connectors);
  const [preference, setPreference] = useState(initial.preference);
  const [priceSensitivity, setPriceSensitivity] = useState(
    initial.priceSensitivity
  );
  const [maxDistance, setMaxDistance] = useState(initial.maxDistanceKm);
  const [evMinPowerKw, setEvMinPowerKw] = useState(initial.evMinPowerKw);
  const [evRequireAc, setEvRequireAc] = useState(initial.evRequireAc);
  const [evRequireDc, setEvRequireDc] = useState(initial.evRequireDc);

  const isFuel = screenMode === "fuel";

  const hasChanges = useMemo(() => {
    return (
      screenMode !== initial.activeTab ||
      fuelType !== initial.fuelType ||
      JSON.stringify(connectors) !== JSON.stringify(initial.connectors) ||
      preference !== initial.preference ||
      priceSensitivity !== initial.priceSensitivity ||
      maxDistance !== initial.maxDistanceKm ||
      evMinPowerKw !== initial.evMinPowerKw ||
      evRequireAc !== initial.evRequireAc ||
      evRequireDc !== initial.evRequireDc
    );
  }, [
    screenMode,
    fuelType,
    connectors,
    preference,
    priceSensitivity,
    maxDistance,
    evMinPowerKw,
    evRequireAc,
    evRequireDc,
    initial,
  ]);

  const toggleConnector = (key: keyof typeof connectors) => {
    setConnectors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const applyFilters = () => {
    onApply({
      ...initial,
      activeTab: screenMode,
      fuelType,
      connectors,
      evMinPowerKw,
      evRequireAc,
      evRequireDc,
      preference,
      priceSensitivity,
      maxDistanceKm: maxDistance,
    });
    onClose();
  };

  const resetToDefaults = () => {
    setScreenMode(initial.activeTab);
    setFuelType(initial.fuelType);
    setConnectors(initial.connectors);
    setPreference(initial.preference);
    setPriceSensitivity(initial.priceSensitivity);
    setMaxDistance(initial.maxDistanceKm);
    setEvMinPowerKw(initial.evMinPowerKw);
    setEvRequireAc(initial.evRequireAc);
    setEvRequireDc(initial.evRequireDc);
  };

  const distanceLabel = useMemo(() => {
    if (maxDistance < 0.1) return "0.0 km";
    return `${maxDistance.toFixed(1)} km`;
  }, [maxDistance]);

  return (
    <div className="relative w-full h-full bg-[#0D0F14] flex flex-col">
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

          <div className="flex flex-col items-center gap-2 min-w-0 px-2 flex-1 max-w-[14rem]">
            <h1 className="text-white font-bold text-lg leading-tight text-center">
              Filters
            </h1>
            <div
              className="flex w-full rounded-xl p-0.5 bg-white/[0.06] border border-white/10"
              role="tablist"
              aria-label="Station type"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isFuel}
                onClick={() => setScreenMode("fuel")}
                className={`
                  flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition
                  ${
                    isFuel
                      ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] shadow-sm"
                      : "text-white/50 hover:text-white/70"
                  }
                `}
              >
                <Fuel className="w-3.5 h-3.5 shrink-0" aria-hidden />
                Fuel
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isFuel}
                onClick={() => setScreenMode("ev")}
                className={`
                  flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition
                  ${
                    !isFuel
                      ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] shadow-sm"
                      : "text-white/50 hover:text-white/70"
                  }
                `}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" aria-hidden />
                EV
              </button>
            </div>
          </div>

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
        <p className="text-[10px] text-white/40 font-medium text-center mt-3 leading-snug">
          {isFuel
            ? "Petrol, diesel, distance & ranking"
            : "Connectors, min kW, AC/DC, distance & ranking"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="space-y-6 pt-6">
          <div>
            <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
              <span className="text-sm">Search preference</span>
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
            {!isFuel && (
              <p className="mt-2 text-[11px] text-white/40 leading-relaxed">
                “Cheapest” still favours nearer chargers when price data is missing.
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/80 font-semibold text-sm">
                Max distance
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

          {isFuel ? (
            <div>
              <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
                <Fuel className="w-4 h-4" />
                <span className="text-sm">Fuel type</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: null, label: "Any" },
                    { value: "petrol", label: "Petrol" },
                    { value: "diesel", label: "Diesel" },
                    { value: "both", label: "Both" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.label}
                    onClick={() => setFuelType(option.value)}
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
              <p className="mt-3 text-xs text-white/45 leading-relaxed">
                Most forecourts sell both petrol and diesel, but the price per litre is usually{" "}
                <span className="text-white/65">different for each</span>. Pick{" "}
                <span className="text-white/65">Petrol</span> or{" "}
                <span className="text-white/65">Diesel</span> here to match what you plan to buy —
                &quot;Both&quot; means sites that sell both grades.
              </p>
            </div>
          ) : (
            <div>
              <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm">EV connectors</span>
              </h2>
              <div className="space-y-2">
                {Object.entries(connectors).map(([key, enabled]) => (
                  <button
                    key={key}
                    type="button"
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
                    <span
                      className={`font-semibold text-sm uppercase ${
                        enabled ? "text-[#00E0C6]" : "text-white/60"
                      }`}
                    >
                      {key}
                    </span>
                    <div
                      className={`
                    w-11 h-6 rounded-full transition relative
                    ${enabled ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]" : "bg-white/20"}
                  `}
                    >
                      <div
                        className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white
                      transition-all shadow-lg
                      ${enabled ? "left-6" : "left-1"}
                    `}
                      />
                    </div>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-white/45 leading-relaxed">
                Only chargers that include at least one selected plug type are shown. Leave at least
                one on so the map is not empty.
              </p>
            </div>
          )}

          {!isFuel && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-white/80 font-semibold text-sm">
                    Minimum power
                  </h2>
                  <span className="text-[#00E0C6] font-bold text-sm tabular-nums">
                    {evMinPowerKw <= 0 ? "Any" : `${evMinPowerKw} kW`}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={EV_FILTER_MAX_KW}
                  step={1}
                  value={evMinPowerKw}
                  onChange={(e) => setEvMinPowerKw(parseInt(e.target.value, 10))}
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
                <div className="flex flex-wrap gap-2 mt-3">
                  {(
                    [
                      { v: 0, label: "Any" },
                      { v: 22, label: "22" },
                      { v: 50, label: "50" },
                      { v: 150, label: "150" },
                    ] as const
                  ).map(({ v, label }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setEvMinPowerKw(v)}
                      className={`
                        px-3 py-1.5 rounded-xl text-[11px] font-semibold transition
                        ${
                          evMinPowerKw === v
                            ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
                            : "bg-white/5 border border-white/10 text-white/55 hover:bg-white/10"
                        }
                      `}
                    >
                      {v === 0 ? label : `${label} kW`}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-white/45 leading-relaxed">
                  Uses each site&apos;s highest reported connector power from Open Charge Map. Sites
                  with no power data are hidden when a minimum is set.
                </p>
              </div>

              <div>
                <h2 className="text-white/80 font-semibold mb-3 text-sm">AC / DC</h2>
                <p className="text-[11px] text-white/45 mb-3 leading-relaxed">
                  Require sites that offer at least one{" "}
                  <span className="text-white/60">AC</span> (e.g. Type 2) and/or{" "}
                  <span className="text-white/60">DC</span> (e.g. CCS) connection. Turn both on to
                  only show locations with both types.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={evRequireAc}
                    onClick={() => setEvRequireAc((x) => !x)}
                    className={`
                    w-full p-4 rounded-2xl
                    transition flex items-center justify-between
                    ${
                      evRequireAc
                        ? "bg-gradient-to-r from-[#00E0C6]/20 to-[#0097FF]/20 border border-[#00E0C6]/30"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }
                  `}
                  >
                    <span
                      className={`font-semibold text-sm ${
                        evRequireAc ? "text-[#00E0C6]" : "text-white/60"
                      }`}
                    >
                      Require AC charging
                    </span>
                    <div
                      className={`
                    w-11 h-6 rounded-full transition relative
                    ${evRequireAc ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]" : "bg-white/20"}
                  `}
                    >
                      <div
                        className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white
                      transition-all shadow-lg
                      ${evRequireAc ? "left-6" : "left-1"}
                    `}
                      />
                    </div>
                  </button>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={evRequireDc}
                    onClick={() => setEvRequireDc((x) => !x)}
                    className={`
                    w-full p-4 rounded-2xl
                    transition flex items-center justify-between
                    ${
                      evRequireDc
                        ? "bg-gradient-to-r from-[#00E0C6]/20 to-[#0097FF]/20 border border-[#00E0C6]/30"
                        : "bg-white/5 border border-white/10 hover:bg-white/10"
                    }
                  `}
                  >
                    <span
                      className={`font-semibold text-sm ${
                        evRequireDc ? "text-[#00E0C6]" : "text-white/60"
                      }`}
                    >
                      Require DC charging
                    </span>
                    <div
                      className={`
                    w-11 h-6 rounded-full transition relative
                    ${evRequireDc ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]" : "bg-white/20"}
                  `}
                    >
                      <div
                        className={`
                      absolute top-1 w-4 h-4 rounded-full bg-white
                      transition-all shadow-lg
                      ${evRequireDc ? "left-6" : "left-1"}
                    `}
                      />
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white/80 font-semibold text-sm">
                Price sensitivity
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

          <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20">
            <p className="text-xs text-white/60 leading-relaxed">
              💡 <strong className="text-white/80">Tip:</strong>{" "}
              {isFuel ? (
                <>
                  Higher price sensitivity prioritises cheaper stations even if they&apos;re further
                  away.
                </>
              ) : (
                <>
                  Higher price sensitivity nudges ranking toward cheaper usage fees when OCM reports
                  them; distance still matters.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

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
              Apply filters
            </>
          ) : (
            "No changes"
          )}
        </button>
      </div>
    </div>
  );
}

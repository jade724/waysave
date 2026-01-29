import { X, Fuel, Zap } from "lucide-react";
import { useState } from "react";
import type { UserPreferences } from "../../lib/preferences";

interface FilterScreenProps {
  initial: UserPreferences;
  onApply: (next: UserPreferences) => void;
  onClose: () => void;
}

export default function FilterScreen({ initial, onApply, onClose }: FilterScreenProps) {
  const [fuelType, setFuelType] = useState(initial.fuelType);
  const [connectors, setConnectors] = useState(initial.connectors);
  const [preference, setPreference] = useState(initial.preference);
  const [priceRange, setPriceRange] = useState(initial.priceSensitivity);
  const [maxDistance, setMaxDistance] = useState(initial.maxDistanceKm);

  const toggleConnector = (key: keyof typeof connectors) => {
    setConnectors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="relative w-full h-full bg-[#0D0F14] flex flex-col pb-40 px-6 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#0D0F14]/95 backdrop-blur-md pb-4 pt-6 mb-6 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-[#1A1D26] border border-white/10 hover:border-white/30 transition"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        <h1 className="text-white text-lg font-semibold">Filters</h1>
        <div className="w-8" />
      </div>

      {/* FUEL TYPE */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">Fuel Type</h2>
        <p className="text-white/40 text-xs mb-3">Choose what fuel you need.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 space-y-3 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">
          <div className="grid grid-cols-3 gap-3">
            {(["unleaded", "diesel", "both"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFuelType(type)}
                className={`
                  p-4 rounded-2xl flex flex-col items-center gap-2 transition border
                  ${
                    fuelType === type
                      ? "bg-gradient-to-br from-[#00E0C6]/25 to-[#0097FF]/25 border-[#00E0C6]/40 text-[#00E0C6]"
                      : "bg-[#1A1D26] border-white/10 text-white/60"
                  }
                `}
              >
                <Fuel className="w-5 h-5" />
                <span className="text-xs capitalize">{type}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* EV CONNECTORS */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">EV Connector Type</h2>
        <p className="text-white/40 text-xs mb-3">Select compatible connectors.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 space-y-3 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">
          {[
            { key: "CCS", label: "CCS (Combined Fast Charge)" },
            { key: "CHAdeMO", label: "CHAdeMO" },
            { key: "Type2", label: "Type 2" },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => toggleConnector(c.key as any)}
              className={`
                w-full p-4 flex items-center justify-between rounded-xl border transition
                ${
                  connectors[c.key as keyof typeof connectors]
                    ? "bg-[#00E0C6]/15 border-[#00E0C6]/40 text-[#00E0C6]"
                    : "bg-[#1A1D26] border-white/10 text-white/60"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5" />
                <span className="text-sm">{c.label}</span>
              </div>

              <div
                className={`
                  w-5 h-5 rounded-full border flex items-center justify-center
                  ${
                    connectors[c.key as keyof typeof connectors]
                      ? "border-[#00E0C6] bg-[#00E0C6]"
                      : "border-white/20"
                  }
                `}
              />
            </button>
          ))}
        </div>
      </section>

      {/* PREFERENCE */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">Preference</h2>
        <p className="text-white/40 text-xs mb-3">Choose your priority.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">
          <div className="grid grid-cols-2 gap-3">
            {(["cheapest", "nearest"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setPreference(type)}
                className={`
                  p-4 rounded-xl text-sm font-medium border transition
                  ${
                    preference === type
                      ? "bg-gradient-to-br from-[#00E0C6]/25 to-[#0097FF]/25 border-[#00E0C6]/40 text-[#00E0C6]"
                      : "bg-[#1A1D26] border-white/10 text-white/60"
                  }
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* PRICE SLIDER */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">Price Sensitivity</h2>
        <p className="text-white/40 text-xs mb-3">Higher = stricter filtering.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">
          <input
            type="range"
            value={priceRange}
            min={0}
            max={100}
            onChange={(e) => setPriceRange(Number(e.target.value))}
            className="w-full accent-[#00E0C6] cursor-pointer"
          />
          <p className="text-white/60 text-xs mt-1">{priceRange}%</p>
        </div>
      </section>

      {/* DISTANCE SLIDER */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">Max Distance</h2>
        <p className="text-white/40 text-xs mb-3">Stations within this radius.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">
          <input
            type="range"
            value={maxDistance}
            min={0.1}
            max={50}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="w-full accent-[#00E0C6] cursor-pointer"
          />
          <p className="text-white/60 text-xs mt-1">{maxDistance} km</p>
        </div>
      </section>

      {/* FOOTER BUTTONS */}
      <div className="mt-10 pb-2 w-full flex gap-3">
        <button
          onClick={() => {
            onApply({
              ...initial,
              fuelType: "unleaded",
              preference: "cheapest",
              priceSensitivity: 50,
              maxDistanceKm: 30,
              connectors: { CCS: true, CHAdeMO: false, Type2: true },
            });
            onClose();
          }}
          className="flex-1 py-3 rounded-2xl bg-[#1A1D26] text-white/70 border border-white/10"
        >
          Reset
        </button>

        <button
          onClick={() => {
            onApply({
              ...initial,
              fuelType,
              connectors,
              preference,
              priceSensitivity: priceRange,
              maxDistanceKm: maxDistance,
            });
            onClose();
          }}
          className="
            flex-1 py-3 rounded-2xl
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-semibold
            shadow-[0_0_20px_rgba(0,224,198,0.35)]
            active:scale-95 transition
          "
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

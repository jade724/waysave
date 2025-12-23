// Improved FilterScreen.tsx
// Fully redesigned for premium UX/UI

import { X, Fuel, Zap } from "lucide-react";
import { useState } from "react";

interface FilterScreenProps {
  onClose: () => void;
}

export default function FilterScreen({ onClose }: FilterScreenProps) {
  const [fuelType, setFuelType] = useState<"diesel" | "unleaded" | "both">(
    "unleaded"
  );

  const [connectors, setConnectors] = useState({
    CCS: true,
    CHAdeMO: false,
    Type2: true,
  });

  const [preference, setPreference] = useState<"fastest" | "cheapest">(
    "cheapest"
  );

  const [priceRange, setPriceRange] = useState(50);
  const [maxDistance, setMaxDistance] = useState(30);

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

        <div className="w-8" /> {/* Right-side spacer */}
      </div>

      {/* FUEL TYPE */}
      <section className="mb-6">
        <h2 className="text-white/90 font-medium mb-1">Fuel Type</h2>
        <p className="text-white/40 text-xs mb-3">Choose what fuel you need.</p>

        <div className="bg-[#111418] rounded-2xl border border-white/10 p-4 space-y-3 shadow-[0_0_20px_-8px_rgba(0,0,0,0.7)]">

          <div className="grid grid-cols-3 gap-3">
            {["unleaded", "diesel", "both"].map((type) => (
              <button
                key={type}
                onClick={() => setFuelType(type as any)}
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
            {["cheapest", "fastest"].map((type) => (
              <button
                key={type}
                onClick={() => setPreference(type as any)}
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
        <h2 className="text-white/90 font-medium mb-1">Price Range</h2>
        <p className="text-white/40 text-xs mb-3">Filter by price sensitivity.</p>

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
            min={1}
            max={50}
            onChange={(e) => setMaxDistance(Number(e.target.value))}
            className="w-full accent-[#00E0C6] cursor-pointer"
          />
          <p className="text-white/60 text-xs mt-1">{maxDistance} km</p>
        </div>
      </section>

      {/* STICKY FOOTER BUTTONS */}
      <div className="mt-10 pb-2 w-full flex gap-3">
        <button
          onClick={() => {
            // Reset defaults
            setFuelType("unleaded");
            setPreference("cheapest");
            setPriceRange(50);
            setMaxDistance(30);
            setConnectors({ CCS: true, CHAdeMO: false, Type2: true });
          }}
          className="flex-1 py-3 rounded-2xl bg-[#1A1D26] text-white/70 border border-white/10"
        >
          Reset
        </button>

        <button
          onClick={onClose}
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

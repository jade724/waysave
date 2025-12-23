// StationDetailsScreen.tsx

import { ArrowLeft, Fuel, Zap, Navigation, MapPin } from "lucide-react";
import GoogleMapBackground from "../map/GoogleMapBackground";
import type { Station } from "../../App";

interface Props {
  station: Station;
  onBack: () => void;
  onSubmitUpdate: () => void;
}

export default function StationDetailsScreen({
  station,
  onBack,
  onSubmitUpdate,
}: Props) {
  return (
    <div className="w-full h-full bg-[#0D0F14] flex flex-col px-6 pt-8 pb-6">

      {/* Back + empty spacer */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="
            p-2 rounded-2xl bg-[#1A1D26]
            border border-white/10 hover:border-white/25
            transition
          "
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>

        <div className="w-8"></div>
      </div>

      {/* Map */}
      <div
        className="
          relative h-48 w-full rounded-3xl overflow-hidden
          border border-white/10 mb-6
          shadow-[0_18px_40px_rgba(0,0,0,0.6)]
        "
      >
        <GoogleMapBackground
          userLocation={{ lat: station.lat, lng: station.lng }}
          markers={[station]}
          zoom={6}
          onPinSelect={() => {}}
        />

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0D0F14] via-[#0D0F14]/60 to-transparent" />
      </div>

      {/* Brand */}
      <div className="text-center mb-4">
        <div
          className="
            w-20 h-20 rounded-2xl mx-auto mb-4
            bg-[#1A1D26] border border-white/10
            flex items-center justify-center
            shadow-[0_10px_25px_rgba(0,0,0,0.5)]
          "
        >
          <div
            className="
              w-14 h-14 rounded-xl
              bg-gradient-to-br from-red-500 to-red-700
              flex items-center justify-center
            "
          >
            <span className="text-white text-xs font-bold">{station.name}</span>
          </div>
        </div>

        <h2 className="text-2xl text-white font-semibold">{station.name}</h2>
        <p className="text-white/60 text-sm">
          Premium Station • Open 24/7
        </p>
      </div>

      {/* Price */}
      <div
        className="
          bg-[#1A1D26]
          rounded-2xl border border-white/10 p-6 text-center
          shadow-[0_8px_28px_rgba(0,0,0,0.5)] mb-6
        "
      >
        <div className="text-[#00E0C6] text-5xl font-semibold">
          {station.price ?? (station.type === "ev" ? "0.42 €/kWh" : "—")}
        </div>
        <div className="text-white/50 text-sm mt-1">
          {station.type === "fuel" ? "/L Unleaded 95" : "EV Charging"}
        </div>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="detail-card">
          {station.type === "fuel" ? (
            <Fuel className="w-5 h-5 text-[#00E0C6] mx-auto mb-2" />
          ) : (
            <Zap className="w-5 h-5 text-[#00E0C6] mx-auto mb-2" />
          )}
          <span className="text-white text-sm">
            {station.type === "fuel" ? "Unleaded" : "EV"}
          </span>
          <span className="text-white/50 text-xs mt-1">Type</span>
        </div>

        <div className="detail-card">
          <Navigation className="w-5 h-5 text-[#00E0C6] mx-auto mb-2" />
          <span className="text-white text-sm">
            {station.distance
              ? `${station.distance.toFixed ? station.distance.toFixed(1) : station.distance} km`
              : "—"}
          </span>
          <span className="text-white/50 text-xs mt-1">Distance</span>
        </div>

        <div className="detail-card">
          <MapPin className="w-5 h-5 text-[#00E0C6] mx-auto mb-2" />
          <span className="text-white text-sm">
            {station.detour ?? "2 mins"}
          </span>
          <span className="text-white/50 text-xs mt-1">Detour</span>
        </div>
      </div>

      {/* Extra Info */}
      <div
        className="
          bg-[#1A1D26]
          rounded-2xl border border-white/10 p-5
          shadow-[0_8px_25px_rgba(0,0,0,0.45)]
          text-white/70 text-sm mb-6 space-y-2
        "
      >
        <p>📍 123 Main Street, City Center</p>
        <p>🏪 Convenience Store Available</p>
        <p>⏱ Open 24/7</p>
      </div>

      {/* Submit */}
      <button
        onClick={onSubmitUpdate}
        className="
          w-full py-4 rounded-2xl
          bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
          text-[#0D0F14] font-semibold
          shadow-[0_0_22px_rgba(0,224,198,0.35)]
          active:scale-95 transition
        "
      >
        Submit Update
      </button>
    </div>
  );
}

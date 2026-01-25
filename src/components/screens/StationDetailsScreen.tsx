// src/components/screens/StationDetailsScreen.tsx

import { ArrowLeft, Navigation } from "lucide-react";
import GoogleMapBackground from "../map/GoogleMapBackground";
import type { Station } from "../../App";

import { useAuth } from "../../lib/authContext";
import { submitStationUpdate } from "../../api/stationUpdates";

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
  // Authenticated user (needed to submit updates)
  const { user } = useAuth();

  // Submit a simple price update for this station
  const handleSubmitUpdate = async () => {
    if (!user) return;

    const raw = window.prompt(
      "Enter new price (numbers only). Leave blank to skip:"
    );

    const newPrice = raw && raw.trim() ? Number(raw) : null;

    try {
      await submitStationUpdate({
        userId: user.id,
        station,
        newPrice: Number.isFinite(newPrice as any) ? newPrice : null,
        note: null,
      });

      onSubmitUpdate();
    } catch (e) {
      console.error("Station update failed", e);
      alert("Could not submit update. Please try again.");
    }
  };

  return (
    <div className="w-full h-full bg-[#0D0F14] flex flex-col px-6 pt-6">
      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/80 mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">Back</span>
      </button>

      {/* Station info */}
      <h1 className="text-white text-2xl font-semibold">
        {station.name}
      </h1>

      <p className="text-white/50 text-sm mt-1">
        {station.distance_km != null
          ? `${station.distance_km.toFixed(1)} km away`
          : "Distance unavailable"}
      </p>

      {/* Price */}
      <div className="mt-4">
        <p className="text-white/40 text-xs uppercase tracking-wide">
          Price
        </p>
        <p className="text-[#00E0C6] text-3xl font-semibold mt-1">
          {station.price_label ?? "Not available"}
        </p>
      </div>

      {/* Map */}
      <div className="mt-6 rounded-2xl overflow-hidden border border-white/10">
        <GoogleMapBackground
          userLocation={{ lat: station.lat, lng: station.lng }}
          markers={[station]}
          zoom={14}
          onPinSelect={() => {}}
        />
      </div>

      {/* Actions */}
      <div className="mt-auto pb-6 pt-6 space-y-3">
        <button
          className="
            w-full flex items-center justify-center gap-2
            py-3 rounded-xl
            bg-[#1A1D26]
            border border-white/10
            text-white/80
          "
        >
          <Navigation className="w-5 h-5" />
          Navigate
        </button>

        <button
          onClick={handleSubmitUpdate}
          className="
            w-full py-3 rounded-xl
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-semibold
            shadow-[0_0_20px_rgba(0,224,198,0.35)]
            active:scale-95 transition
          "
        >
          Submit Update
        </button>
      </div>
    </div>
  );
}

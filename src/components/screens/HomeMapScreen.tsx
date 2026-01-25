// src/components/screens/HomeMapScreen.tsx

import { useEffect, useState, useMemo } from "react";
import { Fuel, Filter, Zap } from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import MapRecenterButton from "../map/MapRecenterButton";

import { fetchEVStations } from "../../api/openChargeMap";
import { calculateDistanceKm } from "../../lib/distance";

import type { Station } from "../../App";
import { useAuth } from "../../lib/authContext";
import type { UserPreferences } from "../../lib/preferences";

interface Props {
  prefs: UserPreferences;
  onPrefsChange: (next: UserPreferences) => void;
  onFiltersClick: () => void;
  onStationClick: (station: Station) => void;
  onPinSelect: (station: Station) => void;
}

export default function HomeMapScreen({
  prefs,
  onPrefsChange,
  onFiltersClick,
  onStationClick,
  onPinSelect,
}: Props) {
  const { profile } = useAuth();

  // Active tab (fuel / EV)
  const [activeTab, setActiveTab] = useState<"fuel" | "ev">(prefs.activeTab);

  useEffect(() => {
    if (prefs.activeTab !== activeTab) {
      onPrefsChange({ ...prefs, activeTab });
    }
  }, [activeTab]);

  // -----------------------------
  // User location
  // -----------------------------
  const FALLBACK_LOCATION = { lat: 53.3498, lng: -6.2603 }; // Dublin
  const [userLocation, setUserLocation] = useState(FALLBACK_LOCATION);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => setUserLocation(FALLBACK_LOCATION)
    );
  }, []);

  // -----------------------------
  // EV stations (real data)
  // -----------------------------
  const [evStations, setEvStations] = useState<Station[]>([]);
  const [loadingEV, setLoadingEV] = useState(false);

  useEffect(() => {
    async function loadEVStations() {
      setLoadingEV(true);

      const data = await fetchEVStations(
        userLocation.lat,
        userLocation.lng,
        prefs.maxDistanceKm
      );

      const formatted: Station[] = data.map((ev: any) => {
        const lat = ev.AddressInfo.Latitude;
        const lng = ev.AddressInfo.Longitude;

      const d = calculateDistanceKm(
        userLocation.lat,
        userLocation.lng,
        lat,
        lng

      );

        return {
          id: String(ev.ID),
          externalId: String(ev.ID),
          name: ev.AddressInfo.Title,
          lat,
          lng,
          type: "ev",
          distance_km: d,
          score: d,

          raw: ev,
        };
      });

      setEvStations(formatted);
      setLoadingEV(false);
    }

    loadEVStations();
  }, [userLocation, prefs.maxDistanceKm]);

  // -----------------------------
  // Fuel stations (placeholder for now)
  // -----------------------------
  const fuelStations: Station[] = [];

  // -----------------------------
  // STEP 1: Distance-based sorting
  // -----------------------------
  const visibleStations = useMemo(() => {
  const list = activeTab === "fuel" ? fuelStations : evStations;

  // 1. Apply filters first
  const filtered = list.filter(
    (s) => s.distance_km != null && s.distance_km <= prefs.maxDistanceKm
  );

  // 2. Rank based on user preference
  const ranked = [...filtered].sort((a, b) => {
    if (a.score == null) return 1;
    if (b.score == null) return -1;

    if (prefs.preference === "nearest") {
      return a.distance_km! - b.distance_km!;
    }

    // "cheapest" (for now still distance-based for EV)
    return a.score - b.score;
  });

  return ranked;
}, [activeTab, evStations, fuelStations, prefs]);


  const bestStationId = 
    visibleStations.length > 0 ? visibleStations[0].id : null;


  return (
    <div className="w-full h-full flex flex-col bg-[#0D0F14]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-white text-2xl font-semibold">WaySave</h1>

        {profile?.full_name && (
          <p className="text-white/40 text-xs">
            Welcome, {profile.full_name}
          </p>
        )}

        {/* Filters button */}
          <button
            onClick={onFiltersClick}
            className="p-2 rounded-xl bg-[#1A1D26] border border-white/10"
          >
            <Filter className="w-5 h-5 text-white" />
          </button>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setActiveTab("fuel")}
            className={activeTab === "fuel" ? "tab-active" : "tab"}
          >
            <Fuel className="w-4 h-4" />
            Fuel
          </button>

          <button
            onClick={() => setActiveTab("ev")}
            className={activeTab === "ev" ? "tab-active" : "tab"}
          >
            <Zap className="w-4 h-4" />
            EV
          </button>
        </div>
      </div>

      

      {/* Map */}
      <div className="relative px-5">
        <GoogleMapBackground
          userLocation={userLocation}
          markers={visibleStations}
          zoom={13}
          onPinSelect={onPinSelect}
        />

        {/* Recenter map on user */}
        <MapRecenterButton
          onPress={() => setUserLocation({ ...userLocation })}
        />
      </div>

      {/* Station list */}
      <div className="flex-1 px-5 py-4 overflow-y-auto">
        {loadingEV && activeTab === "ev" && (
          <p className="text-white/50 text-sm">
            Loading EV stations…
          </p>
        )}

        {!loadingEV && visibleStations.length === 0 && (
          <p className="text-white/40 text-sm">
            No stations found.
          </p>
        )}

        {/* Visible station */}
        {visibleStations.map((station) => (
          <button
            key={station.id}
            onClick={() => onStationClick(station)}
            className="station-card"
          >
            <h3 className="text-white font-medium truncate">
              {station.name}
            </h3>
          {/* Best Station */}
          {station.id === bestStationId && (
            <span className="best-badge">Best value</span>
          )}


            {station.distance_km != null && (
              <p className="text-xs text-white/50">
                {station.distance_km.toFixed(1)} km away
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

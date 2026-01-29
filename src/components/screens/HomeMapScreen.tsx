// src/components/screens/HomeMapScreen.tsx

import { useEffect, useMemo, useState } from "react";
import { Fuel, Zap, Filter } from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import StationCard from "../shared/StationCard";

import { fetchEVStations } from "../../api/openChargeMap";
import { loadFuelStations } from "../../api/fuelStations";
import { calculateDistanceKm } from "../../lib/distance";

import type { Station } from "../../App";
import type { UserPreferences } from "../../lib/preferences";
import { useAuth } from "../../lib/authContext";

interface Props {
  prefs: UserPreferences;
  onPrefsChange: (next: UserPreferences) => void;
  onFiltersClick: () => void;
  onStationClick: (station: Station) => void;
  onPinSelect: (station: Station) => void;
}

/**
 * Apply distance filtering and ranking based on user preferences.
 * This logic is shared by both the map pins and the station list.
 */
function rankStations(
  stations: Station[],
  prefs: UserPreferences
): Station[] {
  return stations
    .filter(
      (s) =>
        s.distance_km != null &&
        s.distance_km <= prefs.maxDistanceKm
    )
    .sort((a, b) => {
      // Nearest stations first
      if (prefs.preference === "nearest") {
        return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      }

      // Cheapest fuel (price weighted more than distance)
      if (prefs.preference === "cheapest") {
        const aScore =
          (a.price_value ?? 999) * 0.7 + (a.distance_km ?? 0) * 0.3;
        const bScore =
          (b.price_value ?? 999) * 0.7 + (b.distance_km ?? 0) * 0.3;
        return aScore - bScore;
      }

      // Fastest (simple proxy: distance)
      if (prefs.preference === "fastest") {
        return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      }

      return 0;
    });
}

export default function HomeMapScreen({
  prefs,
  onPrefsChange,
  onFiltersClick,
  onStationClick,
  onPinSelect,
}: Props) {
  const { profile } = useAuth();

  // Active tab is driven by preferences
  const [activeTab, setActiveTab] = useState<"fuel" | "ev">(
    prefs.activeTab
  );

  // Keep preferences in sync when tab changes
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
  // EV stations
  // -----------------------------
  const [evStations, setEvStations] = useState<Station[]>([]);
  const [loadingEV, setLoadingEV] = useState(false);

  useEffect(() => {
    async function loadEV() {
      setLoadingEV(true);

      const data = await fetchEVStations(
        userLocation.lat,
        userLocation.lng,
        prefs.maxDistanceKm
      );

      const formatted: Station[] = data.map((ev: any) => {
        const lat = ev.AddressInfo.Latitude;
        const lng = ev.AddressInfo.Longitude;

        return {
          id: String(ev.ID),
          externalId: String(ev.ID),
          name: ev.AddressInfo.Title,
          lat,
          lng,
          type: "ev",
          distance_km: calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            lat,
            lng
          ),
          raw: ev,
        };
      });

      setEvStations(formatted);
      setLoadingEV(false);
    }

    loadEV();
  }, [userLocation, prefs.maxDistanceKm]);

  // -----------------------------
  // Fuel stations
  // -----------------------------
  const [fuelStations, setFuelStations] = useState<Station[]>([]);

  useEffect(() => {
    async function loadFuel() {
      const data = await loadFuelStations(
        userLocation.lat,
        userLocation.lng
      );

      setFuelStations(data);
    }

    loadFuel();
  }, [userLocation]);

  // -----------------------------
  // Ranked + filtered stations
  // -----------------------------
  const rankedStations = useMemo(() => {
    const base =
      activeTab === "fuel" ? fuelStations : evStations;

    return rankStations(base, prefs);
  }, [activeTab, fuelStations, evStations, prefs]);

  return (
    <div className="w-full h-full flex flex-col bg-[#0D0F14]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-white text-2xl font-semibold">
              WaySave
            </h1>
            {profile?.full_name && (
              <p className="text-white/40 text-xs">
                Welcome, {profile.full_name}
              </p>
            )}
          </div>

          <button
            onClick={onFiltersClick}
            className="icon-button"
          >
            <Filter className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
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
      <div className="px-5">
        <GoogleMapBackground
          userLocation={userLocation}
          markers={rankedStations}
          zoom={13}
          onPinSelect={onPinSelect}
        />
      </div>

      {/* Station list */}
      <div className="flex-1 px-5 py-4 overflow-y-auto space-y-3">
        {loadingEV && activeTab === "ev" && (
          <p className="text-white/50 text-sm">
            Loading EV stations…
          </p>
        )}

        {rankedStations.map((station, index) => (
          <StationCard
            key={station.id}
            station={station}
            index={index}
            prefs={prefs}
            onPress={() => onStationClick(station)}
          />
        ))}
      </div>
    </div>
  );
}

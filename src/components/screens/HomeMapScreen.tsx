// HomeMapScreen.tsx

import { useEffect, useState } from "react";
import { Fuel, Zap, Navigation, Filter, LogOut } from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import MapRecenterButton from "../map/MapRecenterButton";

import { fetchEVStations } from "../../api/openChargeMap";
import type { Station } from "../../App";
import { useAuth } from "../../lib/authContext";

interface HomeMapScreenProps {
  onFiltersClick: () => void;
  onStationClick: (station: Station) => void; // list click
  onPinSelect: (station: Station) => void; // map pin click
}

export default function HomeMapScreen({
  onFiltersClick,
  onStationClick,
  onPinSelect,
}: HomeMapScreenProps) {
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const [activeTab, setActiveTab] = useState<"fuel" | "ev">("fuel");

  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const FALLBACK = { lat: 53.3498, lng: -6.2603 };

  const [evStations, setEvStations] = useState<any[]>([]);
  const [loadingEV, setLoadingEV] = useState(false);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (e) {
      console.error("Error signing out:", e);
    } finally {
      setSigningOut(false);
    }
  };

  // Get location
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setUserLocation(FALLBACK);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setUserLocation(FALLBACK),
      { enableHighAccuracy: true }
    );
  }, []);

  // Fetch EV stations from OCM
  useEffect(() => {
    if (!userLocation) return;

    const { lat, lng } = userLocation;

    async function loadEV() {
      setLoadingEV(true);
      try {
        const data = await fetchEVStations(lat, lng, 5);
        setEvStations(data);
      } catch (err) {
        console.error("Error fetching EV stations:", err);
      }
      setLoadingEV(false);
    }

    loadEV();
  }, [userLocation]);

  // Mock fuel stations
  const fuelStations: Station[] = userLocation
    ? [
        {
          id: 1,
          name: "Circle K",
          price: "1.55 €/L",
          distance: 0.8,
          detour: "2 mins detour",
          type: "fuel",
          lat: userLocation.lat + 0.003,
          lng: userLocation.lng + 0.003,
        },
        {
          id: 2,
          name: "Shell",
          price: "1.59 €/L",
          distance: 1.2,
          detour: "3 mins detour",
          type: "fuel",
          lat: userLocation.lat - 0.004,
          lng: userLocation.lng + 0.002,
        },
        {
          id: 3,
          name: "BP",
          price: "1.62 €/L",
          distance: 2.5,
          detour: "6 mins detour",
          type: "fuel",
          lat: userLocation.lat - 0.005,
          lng: userLocation.lng - 0.003,
        },
      ]
    : [];

  // Map EV data → Station
  const evStationsFormatted: Station[] = evStations.map((ev, i) => ({
    id: i,
    name: ev.AddressInfo.Title,
    lat: ev.AddressInfo.Latitude,
    lng: ev.AddressInfo.Longitude,
    distance: ev.AddressInfo.Distance,
    type: "ev",
    raw: ev,
  }));

  const mapMarkers = activeTab === "fuel" ? fuelStations : evStationsFormatted;
  const visibleList =
    activeTab === "fuel"
      ? fuelStations
      : evStationsFormatted.sort(
          (a, b) => (a.distance ?? 0) - (b.distance ?? 0)
        ); // EV sorted by distance

  return (
    <div className="w-full h-full flex flex-col bg-[#0D0F14]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="min-w-0">
            <h1 className="text-white text-2xl font-semibold tracking-tight">
              WaySave
            </h1>
            <p className="text-white/50 text-xs">
              Find the best {activeTab === "fuel" ? "fuel" : "EV"} stations
              nearby
            </p>
            {user?.email && (
              <p className="text-white/30 text-[10px] mt-1 truncate max-w-[240px]">
                Signed in as {user.email}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              disabled={signingOut}
              title="Log out"
              className="
                p-2 rounded-2xl bg-[#1A1D26]
                border border-white/10 hover:border-white/25
                transition
                disabled:opacity-60
              "
            >
              <LogOut className="w-5 h-5 text-white" />
            </button>

            <button
              onClick={onFiltersClick}
              title="Filters"
              className="
                p-2 rounded-2xl bg-[#1A1D26]
                border border-white/10 hover:border-white/25
                transition
              "
            >
              <Filter className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Fuel / EV toggle */}
        <div className="flex gap-2 bg-[#12151c] p-1.5 rounded-2xl border border-white/10 shadow-inner">
          <button
            onClick={() => setActiveTab("fuel")}
            className={`
              flex-1 py-3 rounded-2xl flex items-center justify-center gap-2
              text-sm font-medium transition
              ${
                activeTab === "fuel"
                  ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] shadow-[0_0_14px_rgba(0,224,198,0.35)]"
                  : "text-white/55"
              }
            `}
          >
            <Fuel className="w-5 h-5" />
            Fuel
          </button>

          <button
            onClick={() => setActiveTab("ev")}
            className={`
              flex-1 py-3 rounded-2xl flex items-center justify-center gap-2
              text-sm font-medium transition
              ${
                activeTab === "ev"
                  ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] shadow-[0_0_14px_rgba(0,224,198,0.35)]"
                  : "text-white/55"
              }
            `}
          >
            <Zap className="w-5 h-5" />
            EV
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="px-5 pb-3">
        <div
          className="
            h-[260px] w-full rounded-2xl overflow-hidden
            border border-white/10 bg-white/5 backdrop-blur-md
            relative
            shadow-[0_0_40px_-20px_rgba(0,224,198,0.4)]
          "
        >
          {userLocation ? (
            <GoogleMapBackground
              userLocation={userLocation}
              zoom={14}
              markers={mapMarkers}
              className="w-full h-full"
              onPinSelect={onPinSelect}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/50 text-sm">
              Getting your location...
            </div>
          )}

          <MapRecenterButton
            onPress={() => console.log("Recenter pressed")}
            className="top-4 right-4"
          />

          {/* Fade to cards */}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0D0F14] via-[#0D0F14]/60 to-transparent pointer-events-none" />
        </div>
      </div>

      {/* Station list */}
      <div className="flex-1 px-5 pb-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white/80 text-sm">Nearby Stations</h2>
          <span className="text-white/40 text-xs">
            {visibleList.length} options
          </span>
        </div>

        {activeTab === "ev" && loadingEV && (
          <p className="text-white/50 text-xs mb-2">Loading EV stations...</p>
        )}

        <div className="space-y-3">
          {visibleList.map((s) => (
            <button
              key={s.id}
              onClick={() => onStationClick(s)}
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
                <div
                  className="
                    w-12 h-12 rounded-2xl
                    bg-[#0D0F14] border border-white/15
                    flex items-center justify-center
                  "
                >
                  {s.type === "fuel" ? (
                    <Fuel className="w-5 h-5 text-[#00E0C6]" />
                  ) : (
                    <Zap className="w-5 h-5 text-[#00E0C6]" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white text-sm font-medium">{s.name}</h3>
                    {s.type === "fuel" && s.id === 1 && (
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
                    {s.type === "ev" && (
                      <span
                        className="
                          px-2 py-0.5 text-[10px]
                          rounded-xl border border-[#00E0C6]/30
                          text-[#00E0C6] bg-[#00E0C6]/10
                        "
                      >
                        EV station
                      </span>
                    )}
                  </div>

                  <div className="flex items-center text-white/50 text-xs gap-2">
                    <Navigation className="w-3.5 h-3.5" />
                    <span>
                      {s.distance
                        ? `${
                            s.distance.toFixed
                              ? s.distance.toFixed(1)
                              : s.distance
                          } km`
                        : "Distance unknown"}
                    </span>
                    {s.detour && (
                      <>
                        <span>•</span>
                        <span>{s.detour}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-[#00E0C6] text-lg font-semibold">
                  {s.price ?? ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

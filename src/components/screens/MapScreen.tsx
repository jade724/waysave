import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  Fuel,
  Zap,
  Filter,
  LogOut,
  List,
  RefreshCw,
  Navigation,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  MapPin,
  Clock,
  Layers,
  Timer,
} from "lucide-react";

import GoogleMapBackground, { type MapHandle, type RouteInfo } from "../map/GoogleMapBackground";
import DirectionsPanel from "../map/DirectionsPanel";
import StationCard from "../shared/StationCard";

import { fetchEVStations, type OCMStation } from "../../api/openChargeMap";
import { loadFuelStations } from "../../api/fuelStations";
import { enrichWithCommunityPrices } from "../../api/enrichStationsWithPrices";
import { calculateDistanceKm } from "../../lib/distance";
import {
  effectiveEVSearchRadiusKm,
  matchesFuelTypeFilter,
  selectRouteIndexForSearchPreference,
} from "../../lib/stationFilters";
import { devLog } from "../../lib/logger";

import type { Station } from "../../types/station";
import type { UserPreferences } from "../../lib/preferences";
import { useAuth } from "../../lib/authContext";

interface Props {
  prefs: UserPreferences;
  onPrefsChange: (next: UserPreferences) => void;
  onFiltersClick: () => void;
  onStationClick: (station: Station) => void;
  onPinSelect: (station: Station) => void;
  onLoggedOut: () => void;
}

/* Ranking: fuel-type (fuel tab) → geofence by max distance → sort per Filters / Settings. */

function rankStations(
  stations: Station[],
  prefs: UserPreferences,
  activeTab: "fuel" | "ev"
): Station[] {
  let list = stations;

  if (activeTab === "fuel" && prefs.fuelType) {
    list = list.filter((s) => matchesFuelTypeFilter(s, prefs.fuelType));
  }

  const maxKm =
    prefs.maxDistanceKm > 0 ? prefs.maxDistanceKm : Number.POSITIVE_INFINITY;
  const filtered = list.filter(
    (s) => s.distance_km != null && s.distance_km <= maxKm
  );

  return filtered.sort((a, b) => {
      if (prefs.preference === "nearest") {
        return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      }

      if (prefs.preference === "cheapest") {
        const priceWeight = prefs.priceSensitivity;
        const distanceWeight = 1 - prefs.priceSensitivity;

        const aScore = (a.price_value ?? 999) * priceWeight + (a.distance_km ?? 0) * distanceWeight;
        const bScore = (b.price_value ?? 999) * priceWeight + (b.distance_km ?? 0) * distanceWeight;

        return aScore - bScore;
      }

      if (prefs.preference === "fastest") {
        if (a.driving_time_minutes != null && b.driving_time_minutes != null) {
          return a.driving_time_minutes - b.driving_time_minutes;
        }
        return (a.distance_km ?? 0) - (b.distance_km ?? 0);
      }
      return 0;
    });
}

// Simple time-based greeting function based on current hour
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Dublin city centre — used when geolocation is denied or unavailable. */
const FALLBACK_LOCATION = { lat: 53.3498, lng: -6.2603 };

/** Matches polyline colours in `GoogleMapBackground` for route options UI. */
const ROUTE_OPTION_COLORS = ["#00E0C6", "#3B82F6", "#F59E0B"] as const;

export default function MapScreen({
  prefs,
  onPrefsChange,
  onFiltersClick,
  onStationClick,
  onLoggedOut,
}: Props) {
  const { user, signOut } = useAuth();
  const mapRef = useRef<MapHandle>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"fuel" | "ev">(prefs.activeTab);
  const [showList, setShowList] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  // Bottom sheet state (collapsed/half/expanded)
  const [sheetState, setSheetState] = useState<"collapsed" | "half" | "expanded">("half");
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  // Route state (Google may return multiple alternatives; user picks active index for turn-by-turn)
  const [selectedStationForRoute, setSelectedStationForRoute] = useState<Station | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [routeInfos, setRouteInfos] = useState<RouteInfo[]>([]);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(false);
  const [showTraffic, setShowTraffic] = useState(false);

  const routeInfo = useMemo(
    () => routeInfos[selectedRouteIndex] ?? null,
    [routeInfos, selectedRouteIndex]
  );

  /** Index of the shortest-duration option (for “Quickest” hint). */
  const quickestRouteIndex = useMemo(() => {
    if (routeInfos.length < 2) return null;
    let best = 0;
    for (let i = 1; i < routeInfos.length; i++) {
      if (routeInfos[i].durationValue < routeInfos[best].durationValue) best = i;
    }
    return best;
  }, [routeInfos]);

  useEffect(() => {
    if (prefs.activeTab !== activeTab) onPrefsChange({ ...prefs, activeTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const greeting = useMemo(() => getGreeting(), []);
  const name = (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? "there";

  // Geolocation
  const [userLocation, setUserLocation] = useState(FALLBACK_LOCATION);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    setLocationLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        setLocationError(false);
      },
      () => {
        setUserLocation(FALLBACK_LOCATION);
        setLocationLoading(false);
        setLocationError(true);
      }
    );
  }, []);

  // Data fetching
  const [evStations, setEvStations] = useState<Station[]>([]);
  const [fuelStations, setFuelStations] = useState<Station[]>([]);
  const [loadingEV, setLoadingEV] = useState(false);
  const [loadingFuel, setLoadingFuel] = useState(false);
  const [evError, setEvError] = useState<string | null>(null);
  const [fuelError, setFuelError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Load EV stations with error handling and loading state
    // Includes distance calculation using Haversine formula for ranking
    async function loadEV() {
      setLoadingEV(true);
      setEvError(null);
      try {
        const data = await fetchEVStations(
          userLocation.lat,
          userLocation.lng,
          effectiveEVSearchRadiusKm(prefs.maxDistanceKm),
          prefs.connectors
        );
        if (cancelled) return;

        const formatted: Station[] = data.map((ev: OCMStation) => ({
          id: String(ev.AddressInfo.ID),
          externalId: String(ev.AddressInfo.ID),
          name: ev.AddressInfo.Title,
          lat: ev.AddressInfo.Latitude,
          lng: ev.AddressInfo.Longitude,
          type: "ev" as const,
          distance_km: calculateDistanceKm(
            userLocation.lat,
            userLocation.lng,
            ev.AddressInfo.Latitude,
            ev.AddressInfo.Longitude
          ),
          raw: ev,
        }));

        // Update state with formatted stations
        setEvStations(formatted);
      } catch (err) {
        if (!cancelled) {
          setEvError("Failed to load EV stations. Please try again.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoadingEV(false);
      }
    }

    // Load fuel stations with error handling and loading state
    loadEV();
    return () => { cancelled = true; };
  }, [userLocation, prefs.maxDistanceKm, prefs.connectors])

  useEffect(() => {
    let cancelled = false;

    // Load fuel stations with error handling and loading state
    // Distance calculation is done in the API layer for fuel stations, so we just set the state here
    // Fuel stations are loaded separately to allow for different ranking and filtering logic if needed
    async function loadFuel() {
      setLoadingFuel(true);
      setFuelError(null);
      try {
        const data = await loadFuelStations(
          userLocation.lat,
          userLocation.lng,
          prefs.maxDistanceKm,
          prefs.fuelType
        );
        if (cancelled) return;
         // Enrich with community-submitted prices from Supabase
        const enriched = await enrichWithCommunityPrices(data);
        if (cancelled) return;
        setFuelStations(enriched);
      } catch (err) {
        if (!cancelled) {
          setFuelError("Failed to load fuel stations. Please try again.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoadingFuel(false);
      }
    }

    loadFuel();
    return () => { cancelled = true; };
  }, [userLocation, prefs.maxDistanceKm, prefs.fuelType]);


  // Apply ranking algorithm with memoization
  // calls timsort (O(n log n)) but only when dependencies change (activeTab, stations, prefs)
  /** Same filters/sort as the list (max distance, fuel type, etc.) — used for tab counts and list. */
  const fuelRanked = useMemo(
    () => rankStations(fuelStations, prefs, "fuel"),
    [fuelStations, prefs]
  );
  const evRanked = useMemo(
    () => rankStations(evStations, prefs, "ev"),
    [evStations, prefs]
  );

  const rankedStations = useMemo(() => {
    const base = activeTab === "fuel" ? fuelRanked : evRanked;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return base;
    return base.filter((station) => station.name.toLowerCase().includes(q));
  }, [activeTab, fuelRanked, evRanked, searchQuery]);

  /** Align default / active route alternative with Filters “search preference” (nearest / fastest / cheapest→distance). */
  useEffect(() => {
    if (routeInfos.length === 0) return;
    setSelectedRouteIndex(
      selectRouteIndexForSearchPreference(routeInfos, prefs.preference)
    );
  }, [routeInfos, prefs.preference]);

  // User actions
  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      onLoggedOut();
    }
  };

  const handleRefresh = () => {
    setLocationLoading(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationLoading(false);
        setLocationError(false);
      },
      () => {
        setUserLocation(FALLBACK_LOCATION);
        setLocationLoading(false);
        setLocationError(true);
      }
    );
  };

  const handleRecenter = () => {
    mapRef.current?.recenter();
    handleRefresh();
  };

  // Route handlers
  const handleStationSelectForRoute = (station: Station) => {
    setSelectedStationForRoute(station);
    setShowRoute(true);
    setShowDirectionsPanel(false);
    setRouteInfos([]);
    setSelectedRouteIndex(0);
  };

  const handleRoutesCalculated = useCallback((routes: RouteInfo[]) => {
    setRouteInfos(routes);
  }, []);

  const handleClearRoute = () => {
    setShowRoute(false);
    setSelectedStationForRoute(null);
    setRouteInfos([]);
    setSelectedRouteIndex(0);
    setShowDirectionsPanel(false);
    mapRef.current?.clearRoute();
  };

  const handleToggleTraffic = () => {
    setShowTraffic(!showTraffic);
    devLog(`🚦 Traffic layer ${!showTraffic ? "enabled" : "disabled"}`);
  };

  // Drag handlers
  const handleDragStart = (clientY: number) => {
    setIsDragging(true);
    setStartY(clientY);
    setCurrentY(clientY);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging) return;
    setCurrentY(clientY);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    
    const dragDistance = currentY - startY;
    const threshold = 50;

    if (dragDistance > threshold) {
      if (sheetState === "expanded") setSheetState("half");
      else if (sheetState === "half") setSheetState("collapsed");
    } else if (dragDistance < -threshold) {
      if (sheetState === "collapsed") setSheetState("half");
      else if (sheetState === "half") setSheetState("expanded");
    }

    setIsDragging(false);
    setStartY(0);
    setCurrentY(0);
  };

  const getSheetHeight = () => {
    switch (sheetState) {
      case "collapsed": return "12vh";
      case "half": return "40vh";
      case "expanded": return "85vh";
      default: return "40vh";
    }
  };

  return (
    <div className="absolute inset-0">
      {/* Map */}
      <div className="absolute inset-0">
        <GoogleMapBackground
          ref={mapRef}
          userLocation={userLocation}
          markers={rankedStations}
          zoom={13}
          onPinSelect={handleStationSelectForRoute}
          selectedStation={selectedStationForRoute}
          showRoute={showRoute}
          showTraffic={showTraffic}
          selectedRouteIndex={selectedRouteIndex}
          onRoutesCalculated={handleRoutesCalculated}
        />
      </div>

      {/* Directions Panel */}
      {showDirectionsPanel && routeInfo && selectedStationForRoute && (
        <div className="absolute inset-0 z-30">
          <DirectionsPanel
            routeInfo={routeInfo}
            stationName={selectedStationForRoute.name}
            onClose={() => setShowDirectionsPanel(false)}
          />
        </div>
      )}

      {/* ---------- TOP OVERLAY ---------- */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pointer-events-none">
        <div className="pointer-events-auto space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-2">
            {/* Left: Title */}
            <div className="bg-[#0D0F14]/90 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 shadow-lg">
              <h1 className="text-white text-lg font-bold tracking-tight">
                WaySave
              </h1>
              <p className="text-white/50 text-xs">
                {greeting}, {name.split(' ')[0]}
              </p>
              {locationError && (
                <p className="text-orange-400 text-[10px] mt-0.5">
                  Default location
                </p>
              )}
            </div>

            {/* Right: Action Buttons */}
            <div className="flex gap-2">
              {/* Search Toggle */}
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`
                  w-10 h-10 rounded-xl
                  backdrop-blur-md border transition shadow-lg
                  flex items-center justify-center
                  ${showSearch 
                    ? 'bg-[#00E0C6]/20 border-[#00E0C6]/50' 
                    : 'bg-[#0D0F14]/90 border-white/10 hover:bg-white/10'
                  }
                `}
                aria-label="Search"
              >
                <Search className="w-4 h-4 text-white/90" />
              </button>

              {/* Filters */}
              <button
                onClick={onFiltersClick}
                className="
                  w-10 h-10 rounded-xl
                  bg-[#0D0F14]/90 backdrop-blur-md
                  border border-white/10 shadow-lg
                  flex items-center justify-center
                  hover:bg-white/10 transition
                "
                aria-label="Filters"
              >
                <Filter className="w-4 h-4 text-white/90" />
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="
                  w-10 h-10 rounded-xl
                  bg-[#0D0F14]/90 backdrop-blur-md
                  border border-white/10 shadow-lg
                  flex items-center justify-center
                  hover:bg-red-500/20 hover:border-red-500/30 transition
                "
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 text-white/90" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && (
            <div className="animate-[fadeIn_0.2s_ease-out]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search stations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="
                    w-full pl-10 pr-10 py-3
                    bg-[#0D0F14]/90 backdrop-blur-md
                    border border-white/10 rounded-2xl shadow-lg
                    text-white placeholder-white/40 text-sm
                    focus:outline-none focus:border-[#00E0C6]/50
                    transition
                  "
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-white/40 hover:text-white/80" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Fuel/EV Tabs */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("fuel")}
              aria-pressed={activeTab === "fuel"}
              className={`
                flex-1 py-2.5 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2
                transition backdrop-blur-md shadow-lg
                ${
                  activeTab === "fuel"
                    ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] border-0"
                    : "bg-[#0D0F14]/90 border border-white/10 text-white/70 hover:text-white"
                }
              `}
            >
              <Fuel className="w-4 h-4" />
              <span>Fuel</span>
              <span className="opacity-70">({fuelRanked.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ev")}
              aria-pressed={activeTab === "ev"}
              className={`
                flex-1 py-2.5 rounded-xl font-semibold text-sm
                flex items-center justify-center gap-2
                transition backdrop-blur-md shadow-lg
                ${
                  activeTab === "ev"
                    ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] border-0"
                    : "bg-[#0D0F14]/90 border border-white/10 text-white/70 hover:text-white"
                }
              `}
            >
              <Zap className="w-4 h-4" />
              <span>EV</span>
              <span className="opacity-70">({evRanked.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ---------- 🆕 ROUTE INFO OVERLAY ---------- */}
      {showRoute && selectedStationForRoute && routeInfo && (
        <div className="absolute top-24 left-4 right-4 z-10 pointer-events-auto">
          <div className="bg-[#0D0F14]/95 backdrop-blur-xl border border-[#00E0C6]/30 rounded-2xl shadow-lg overflow-hidden">
            {/* Route Header */}
            <div className="px-4 py-3 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-[#00E0C6] rounded-full animate-pulse" />
                    <p className="text-white font-bold text-sm">Active Route</p>
                  </div>
                  <p className="text-white/60 text-xs">
                    To {selectedStationForRoute.name}
                  </p>
                  <p className="text-white/35 text-[10px] mt-1 leading-snug">
                    <span className="capitalize text-white/50">{prefs.preference}</span> sort — same
                    as the station list. Route alternatives default to that sort.
                    {prefs.maxDistanceKm > 0 ? (
                      <> List stations: within {prefs.maxDistanceKm} km.</>
                    ) : (
                      <> List: no distance cap.</>
                    )}
                  </p>
                </div>
                
                {/* Clear Route Button */}
                <button
                  onClick={handleClearRoute}
                  className="
                    w-8 h-8 rounded-lg
                    bg-white/5 hover:bg-white/10
                    border border-white/10
                    flex items-center justify-center
                    transition
                  "
                  aria-label="Clear route"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            {/* Route Stats */}
            <div className="px-4 py-3 grid grid-cols-2 gap-3">
              {/* Distance */}
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00E0C6]" />
                <div>
                  <p className="text-white/50 text-[10px] uppercase">Distance</p>
                  <p className="text-white font-bold text-sm">{routeInfo.distance}</p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <div>
                  <p className="text-white/50 text-[10px] uppercase">Duration</p>
                  <p className="text-white font-bold text-sm">{routeInfo.duration}</p>
                </div>
              </div>
            </div>

            {/* Route alternatives — colours match map polylines */}
            {routeInfos.length > 1 && (
              <div className="px-4 pb-3 border-t border-white/5 pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45 mb-2">
                  Route options
                </p>
                <p className="text-[11px] text-white/40 mb-3 leading-snug">
                  Tap to highlight that path on the map and update directions below.
                </p>
                <div
                  className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                  role="tablist"
                  aria-label="Choose route alternative"
                >
                  {routeInfos.map((r, i) => {
                    const color = ROUTE_OPTION_COLORS[i % ROUTE_OPTION_COLORS.length];
                    const active = selectedRouteIndex === i;
                    const isQuickest = quickestRouteIndex === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => setSelectedRouteIndex(i)}
                        className={`
                          shrink-0 snap-start text-left rounded-2xl pl-3 pr-3 py-2.5 min-w-[118px] max-w-[150px] transition
                          border relative overflow-hidden
                          ${
                            active
                              ? "bg-white/[0.08] border-white/25 shadow-[0_0_0_1px_rgba(255,255,255,0.06)]"
                              : "bg-white/[0.03] border-white/10 hover:bg-white/[0.06] hover:border-white/15"
                          }
                        `}
                      >
                        <span
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
                          style={{ backgroundColor: color }}
                          aria-hidden
                        />
                        <div className="pl-2 flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className="inline-flex h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/55">
                              Route {i + 1}
                            </span>
                            {isQuickest && (
                              <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-300/95 border border-emerald-500/25">
                                <Timer className="w-2.5 h-2.5" aria-hidden />
                                Quickest
                              </span>
                            )}
                          </div>
                          <span className="text-base font-bold text-white leading-tight tabular-nums">
                            {r.duration}
                          </span>
                          <span className="text-[11px] text-white/50 tabular-nums">{r.distance}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="px-4 pb-3 flex gap-2">
              <button
                onClick={() => setShowDirectionsPanel(true)}
                className="
                  flex-1 py-2 rounded-xl
                  bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
                  text-[#0D0F14] text-xs font-bold
                  flex items-center justify-center gap-2
                  transition hover:shadow-lg
                "
              >
                <Navigation className="w-3 h-3" />
                Directions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- FLOATING ACTION BUTTONS (solid fills — gradients on circles caused clipping artifacts) ---------- */}
      <div
        className="absolute right-4 z-20 flex flex-col gap-4 pointer-events-none"
        style={{
          bottom: "max(10rem, calc(env(safe-area-inset-bottom, 0px) + 9rem))",
        }}
      >
        <button
          type="button"
          onClick={handleToggleTraffic}
          className={`
            w-12 h-12 shrink-0 rounded-full pointer-events-auto
            backdrop-blur-md border transition shadow-lg
            flex items-center justify-center
            ${showTraffic
              ? "bg-orange-500/20 border-orange-500/50"
              : "bg-[#0D0F14]/90 border-white/10"
            }
          `}
          aria-label="Toggle traffic"
        >
          <Layers className={`w-5 h-5 ${showTraffic ? "text-orange-400" : "text-white/90"}`} />
        </button>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={locationLoading}
          className="
            w-12 h-12 shrink-0 rounded-full pointer-events-auto
            bg-[#0D0F14]/90 backdrop-blur-md
            border border-white/10 shadow-lg
            flex items-center justify-center
            hover:bg-white/10 transition
            disabled:opacity-50
          "
          aria-label="Refresh location"
        >
          <RefreshCw className={`w-5 h-5 text-white/90 ${locationLoading ? "animate-spin" : ""}`} />
        </button>

        <button
          type="button"
          onClick={handleRecenter}
          className="
            w-12 h-12 shrink-0 rounded-full pointer-events-auto
            bg-[#00E0C6] border border-[#00c4b0] shadow-[0_4px_20px_rgba(0,224,198,0.35)]
            flex items-center justify-center
            hover:brightness-110 active:scale-95 transition
          "
          aria-label="Recenter map on your location"
        >
          <Navigation className="w-5 h-5 text-[#0D0F14]" />
        </button>
      </div>

      {/* ---------- 🆕 DRAGGABLE BOTTOM SHEET (List) ---------- */}
      {showList && !showDirectionsPanel && (
        <div 
          role="region"
          aria-label="Nearby stations list"
          className="absolute inset-x-0 z-20 px-4 pb-3 transition-all duration-300 ease-out bottom-28"
          style={{ 
            height: getSheetHeight(),
            touchAction: 'none'
          }}
        >
          <div className="h-full bg-[#0D0F14]/95 backdrop-blur-xl border border-white/10 rounded-t-3xl shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
            
            {/* 🆕 DRAGGABLE HEADER */}
            <div 
              className="flex-shrink-0 cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => handleDragStart(e.clientY)}
              onMouseMove={(e) => handleDragMove(e.clientY)}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
              onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
              onTouchEnd={handleDragEnd}
            >
              {/* Drag Handle */}
              <div className="flex justify-center py-3">
                <div className="w-12 h-1.5 bg-white/30 rounded-full" />
              </div>

              {/* Stats Header */}
              <div className="px-4 pb-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-semibold flex items-center gap-2">
                      {rankedStations.length} Station{rankedStations.length !== 1 ? 's' : ''}
                      {sheetState === "expanded" && (
                        <ChevronDown className="w-4 h-4 text-white/50" />
                      )}
                      {sheetState === "collapsed" && (
                        <ChevronUp className="w-4 h-4 text-white/50" />
                      )}
                    </p>
                    <p className="text-white/50 text-xs">
                      {prefs.preference === "nearest" 
                        ? "Nearest first" 
                        : prefs.preference === "cheapest"
                        ? "Best value first"
                        : "Fastest route first"
                      }
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {searchQuery && (
                      <p className="text-white/50 text-xs bg-white/5 px-2 py-1 rounded-lg">
                        "{searchQuery}"
                      </p>
                    )}
                    
                    <button
                      onClick={() => setShowList(false)}
                      className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
                      aria-label="Hide list"
                    >
                      <X className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SCROLLABLE CONTENT */}
            {sheetState !== "collapsed" && (
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {/* Error State */}
                {((activeTab === "ev" && evError) || (activeTab === "fuel" && fuelError)) &&  (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <p className="text-red-400 text-sm">
                      {activeTab === "ev" ? evError : fuelError}
                    </p>
                  </div>
                )}

                {/* Loading State */}
                {((loadingEV && activeTab === "ev") || (loadingFuel && activeTab === "fuel")) && (
                  <div className="text-white/50 text-sm text-center py-8">
                    <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-[#00E0C6]" />
                    <p>Finding nearby stations…</p>
                  </div>
                )}

                {/* Empty State */}
                {!loadingEV && !loadingFuel && rankedStations.length === 0 && (
                  <div className="text-center text-white/50 text-sm py-8">
                    <p className="mb-3">
                      {searchQuery 
                        ? `No stations match "${searchQuery}"`
                        : "No stations match your filters"
                      }
                    </p>
                    <button
                      onClick={onFiltersClick}
                      className="px-4 py-2 bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] rounded-xl font-semibold text-sm"
                    >
                      Adjust Filters
                    </button>
                  </div>
                )}

                {/* Station Cards */}
                {rankedStations.map((station, index) => (
                  <div key={station.id} className="space-y-2">
                    <StationCard
                      station={station}
                      index={index}
                      prefs={prefs}
                      onPress={() => onStationClick(station)}
                    />
                    
                    {/* 🆕 Route Button */}
                    <button
                      onClick={() => handleStationSelectForRoute(station)}
                      className={`
                        w-full py-2 rounded-xl
                        text-sm font-semibold
                        flex items-center justify-center gap-2
                        transition
                        ${selectedStationForRoute?.id === station.id && showRoute
                          ? 'bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]'
                          : 'bg-white/5 hover:bg-white/10 border border-white/10 text-white'
                        }
                      `}
                    >
                      <Navigation className="w-4 h-4" />
                      {selectedStationForRoute?.id === station.id && showRoute ? 'Route Active' : 'Show Route'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* COLLAPSED STATE MESSAGE */}
            {sheetState === "collapsed" && (
              <div className="flex-1 flex items-center justify-center text-white/50 text-sm">
                <p>👆 Drag up to view stations</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SHOW LIST BUTTON - When hidden */}
      {!showList && !showDirectionsPanel && (
        <button
          onClick={() => {
            setShowList(true);
            setSheetState("half");
          }}
          className="
            absolute bottom-[6.75rem] right-4 z-30
            w-12 h-12 rounded-full pointer-events-auto
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            shadow-[0_0_20px_rgba(0,224,198,0.4)]
            flex items-center justify-center
            hover:scale-105 active:scale-95 transition
          "
          aria-label="Show list"
        >
          <List className="w-5 h-5 text-[#0D0F14]" />
        </button>
      )}
    </div>
  );
}
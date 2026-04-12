import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Fuel,
  Zap,
  Heart,
  Filter,
  LogOut,
  List,
  RefreshCw,
  Navigation,
  LocateFixed,
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
import StationListSkeleton from "../shared/StationListSkeleton";

import { fetchUserFavorites } from "../../api/favorites";
import { fetchEVStations, type OCMStation } from "../../api/openChargeMap";
import { extractOcmChargingDetails } from "../../lib/ocmChargingInfo";
import { loadFuelStations } from "../../api/fuelStations";
import { enrichWithCommunityPrices } from "../../api/enrichStationsWithPrices";
import { calculateDistanceKm } from "../../lib/distance";
import {
  effectiveEVSearchRadiusKm,
  matchesFuelTypeFilter,
  selectRouteIndexForSearchPreference,
} from "../../lib/stationFilters";
import { devLog } from "../../lib/logger";
import { stripHtml } from "../../lib/stripHtml";

import type { Station } from "../../types/station";
import { effectiveFuelPriceEurPerL } from "../../lib/fuelPrices";
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

        const aPrice = effectiveFuelPriceEurPerL(a, prefs.fuelType) ?? 999;
        const bPrice = effectiveFuelPriceEurPerL(b, prefs.fuelType) ?? 999;

        const aScore = aPrice * priceWeight + (a.distance_km ?? 0) * distanceWeight;
        const bScore = bPrice * priceWeight + (b.distance_km ?? 0) * distanceWeight;

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

/** Throttle live GPS updates for the map (ms) when browsing stations. */
const LIVE_GPS_MIN_INTERVAL_MS = 1600;
/** Faster updates while a route is active so the dot and turn prompts stay usable while driving. */
const LIVE_NAV_GPS_MIN_INTERVAL_MS = 900;
/** Advance to the next Directions step when within this distance of the step end (meters). */
const STEP_COMPLETE_THRESHOLD_M = 52;
/** Refresh station lists while following only after moving this far (km) or after the time below. */
const STATION_ANCHOR_MIN_MOVE_KM = 0.25;
const STATION_ANCHOR_MIN_INTERVAL_MS = 40_000;

/** Matches polyline colours in `GoogleMapBackground` for route options UI. */
const ROUTE_OPTION_COLORS = ["#00E0C6", "#3B82F6", "#F59E0B"] as const;

function formatNavDistanceMeters(m: number): string {
  if (!Number.isFinite(m) || m < 0) return "—";
  if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
  return `${Math.round(m)} m`;
}

/** Maneuver icon for next-turn banner (matches DirectionsPanel). */
function maneuverIcon(maneuver?: string): string {
  if (!maneuver) return "→";
  const icons: Record<string, string> = {
    "turn-left": "↰",
    "turn-right": "↱",
    "turn-slight-left": "↖",
    "turn-slight-right": "↗",
    "turn-sharp-left": "⤺",
    "turn-sharp-right": "⤻",
    "uturn-left": "↶",
    "uturn-right": "↷",
    merge: "⛙",
    "roundabout-left": "⭯",
    "roundabout-right": "⭮",
    straight: "↑",
  };
  return icons[maneuver] || "→";
}

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

  /** Bump to re-fetch EV + fuel lists (pull-to-refresh / retry). */
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const bumpListRefresh = useCallback(() => setListRefreshKey((k) => k + 1), []);

  const [mapHintDismissed, setMapHintDismissed] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("waysave_map_source_hint_v1") === "1";
  });

  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const listScrollParentRef = useRef<HTMLDivElement>(null);

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

  // Geolocation — `userLocation` is the anchor for station APIs; `livePosition` updates while "Follow me" is on.
  const [userLocation, setUserLocation] = useState(FALLBACK_LOCATION);
  const [livePosition, setLivePosition] = useState(FALLBACK_LOCATION);
  const [followMe, setFollowMe] = useState(false);
  const [directionsOrigin, setDirectionsOrigin] = useState<{ lat: number; lng: number } | null>(
    null
  );
  /** Compass heading from GPS (degrees), when the device reports it — rotates the map in follow mode. */
  const [liveHeading, setLiveHeading] = useState<number | null>(null);
  /** Which step along the active route we are navigating (0-based). */
  const [navStepIndex, setNavStepIndex] = useState(0);
  const [locationLoading, setLocationLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);

  const lastGpsPushRef = useRef(0);
  const stationAnchorSyncRef = useRef({
    t: 0,
    lat: FALLBACK_LOCATION.lat,
    lng: FALLBACK_LOCATION.lng,
  });
  const prevFollowMeRef = useRef(false);

  const mapDisplayPosition = followMe ? livePosition : userLocation;

  const geoBaseOptions = useMemo(
    () => ({
      enableHighAccuracy: prefs.locationHighAccuracy,
      timeout: 25_000 as const,
    }),
    [prefs.locationHighAccuracy]
  );

  useEffect(() => {
    if (!prefs.locationLiveUpdates && followMe) {
      setFollowMe(false);
    }
  }, [prefs.locationLiveUpdates, followMe]);

  useEffect(() => {
    let cancelled = false;

    const applyPosition = (pos: GeolocationPosition) => {
      const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(next);
      setLivePosition(next);
      const h = pos.coords.heading;
      setLiveHeading(h != null && !Number.isNaN(h) ? h : null);
      setLocationLoading(false);
      setLocationError(false);
    };

    const applyFallback = () => {
      setUserLocation(FALLBACK_LOCATION);
      setLivePosition(FALLBACK_LOCATION);
      setLiveHeading(null);
      setLocationLoading(false);
      setLocationError(true);
    };

    if (!navigator.geolocation) {
      applyFallback();
      return;
    }

    setLocationLoading(true);

    /** First try: user prefs (often high accuracy). Second: lower accuracy after delay — helps macOS / desktop. */
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!cancelled) applyPosition(pos);
      },
      (err) => {
        devLog("Geolocation first attempt failed", err?.code, err?.message);
        window.setTimeout(() => {
          if (cancelled) return;
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              if (!cancelled) applyPosition(pos);
            },
            (err2) => {
              devLog("Geolocation retry failed", err2?.code, err2?.message);
              if (!cancelled) applyFallback();
            },
            {
              enableHighAccuracy: false,
              timeout: 20_000,
              maximumAge: 60_000,
            }
          );
        }, 800);
      },
      { ...geoBaseOptions, maximumAge: 15_000 }
    );

    return () => {
      cancelled = true;
    };
  }, [geoBaseOptions]);

  useEffect(() => {
    if (!followMe || !navigator.geolocation || !prefs.locationLiveUpdates) return;

    const minMs = showRoute ? LIVE_NAV_GPS_MIN_INTERVAL_MS : LIVE_GPS_MIN_INTERVAL_MS;
    const maxAge = showRoute ? 1000 : 2000;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastGpsPushRef.current < minMs) return;
        lastGpsPushRef.current = now;
        setLivePosition({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        const h = pos.coords.heading;
        setLiveHeading(h != null && !Number.isNaN(h) ? h : null);
      },
      (err) => {
        devLog("Geolocation watch error", err?.message ?? err);
      },
      { ...geoBaseOptions, maximumAge: maxAge }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [followMe, showRoute, prefs.locationLiveUpdates, geoBaseOptions]);

  useEffect(() => {
    if (followMe && !prevFollowMeRef.current) {
      stationAnchorSyncRef.current = {
        t: Date.now(),
        lat: userLocation.lat,
        lng: userLocation.lng,
      };
    }
    prevFollowMeRef.current = followMe;
  }, [followMe, userLocation.lat, userLocation.lng]);

  useEffect(() => {
    if (!followMe) return;
    const ref = stationAnchorSyncRef.current;
    const km = calculateDistanceKm(ref.lat, ref.lng, livePosition.lat, livePosition.lng);
    const elapsed = Date.now() - ref.t;
    if (elapsed < STATION_ANCHOR_MIN_INTERVAL_MS && km < STATION_ANCHOR_MIN_MOVE_KM) return;
    stationAnchorSyncRef.current = {
      t: Date.now(),
      lat: livePosition.lat,
      lng: livePosition.lng,
    };
    setUserLocation({ lat: livePosition.lat, lng: livePosition.lng });
  }, [followMe, livePosition.lat, livePosition.lng]);

  /** New destination or route alternative → restart turn-by-turn from step 0. */
  useEffect(() => {
    if (!showRoute) return;
    setNavStepIndex(0);
  }, [showRoute, selectedStationForRoute?.id, selectedRouteIndex]);

  /** Advance the current step when GPS shows you’ve reached the end of this leg (straight-line, like basic satnav). */
  useEffect(() => {
    if (!showRoute || !routeInfo?.steps?.length) return;
    setNavStepIndex((idx) => {
      const steps = routeInfo.steps;
      const end = steps[idx]?.end_location;
      if (!end) return idx;
      const distM =
        calculateDistanceKm(
          mapDisplayPosition.lat,
          mapDisplayPosition.lng,
          end.lat(),
          end.lng()
        ) * 1000;
      if (distM < STEP_COMPLETE_THRESHOLD_M && idx < steps.length - 1) return idx + 1;
      return idx;
    });
  }, [mapDisplayPosition.lat, mapDisplayPosition.lng, showRoute, routeInfo]);

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

        const formatted: Station[] = data.map((ev: OCMStation) => {
          const raw = ev as unknown;
          const ocm = extractOcmChargingDetails(raw);
          return {
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
            evMaxPowerKw: ocm.maxPowerKw,
            evUsageCostHint: ocm.usageCost,
            evOperatorWebsiteUrl: ocm.operatorWebsiteUrl,
            raw: ev,
          };
        });

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
    return () => {
      cancelled = true;
    };
  }, [userLocation, prefs.maxDistanceKm, prefs.connectors, listRefreshKey]);

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
    return () => {
      cancelled = true;
    };
  }, [userLocation, prefs.maxDistanceKm, prefs.fuelType, listRefreshKey]);


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

  useEffect(() => {
    if (!user?.id) {
      setFavoriteIds(new Set());
      return;
    }
    let cancelled = false;
    fetchUserFavorites(user.id)
      .then((favs) => {
        if (!cancelled) setFavoriteIds(new Set(favs.map((f) => f.id)));
      })
      .catch(() => {
        if (!cancelled) setFavoriteIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, listRefreshKey]);

  const listStations = useMemo(() => {
    if (!favoritesOnly || !user?.id) return rankedStations;
    return rankedStations.filter((s) => favoriteIds.has(s.id));
  }, [rankedStations, favoritesOnly, favoriteIds, user?.id]);

  const cheapestHint = useMemo(() => {
    if (activeTab !== "fuel" || prefs.preference !== "cheapest" || listStations.length === 0) {
      return null;
    }
    const top = listStations[0];
    const p = effectiveFuelPriceEurPerL(top, prefs.fuelType);
    if (p == null) return null;
    return { name: top.name, price: p };
  }, [activeTab, prefs.preference, prefs.fuelType, listStations]);

  const rowVirtualizer = useVirtualizer({
    count: listStations.length,
    getScrollElement: () => listScrollParentRef.current,
    estimateSize: () => 100,
    overscan: 8,
  });

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
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(next);
        setLivePosition(next);
        const h = pos.coords.heading;
        setLiveHeading(h != null && !Number.isNaN(h) ? h : null);
        setLocationLoading(false);
        setLocationError(false);
      },
      () => {
        setUserLocation(FALLBACK_LOCATION);
        setLivePosition(FALLBACK_LOCATION);
        setLiveHeading(null);
        setLocationLoading(false);
        setLocationError(true);
      },
      { ...geoBaseOptions, maximumAge: 0 }
    );
  };

  const handleToggleFollowMe = useCallback(() => {
    if (!prefs.locationLiveUpdates) return;
    setFollowMe((wasOn) => {
      if (!wasOn) {
        setLivePosition({ lat: userLocation.lat, lng: userLocation.lng });
        lastGpsPushRef.current = 0;
      }
      return !wasOn;
    });
  }, [userLocation, prefs.locationLiveUpdates]);

  const handleRecenter = () => {
    mapRef.current?.recenter();
    handleRefresh();
  };

  // Route handlers — optionally auto-follow (Settings → Location).
  const handleStationSelectForRoute = (station: Station) => {
    const origin = { ...mapDisplayPosition };
    setDirectionsOrigin(origin);
    setLivePosition({ lat: origin.lat, lng: origin.lng });
    lastGpsPushRef.current = 0;
    if (prefs.locationAutoFollowOnRoute && prefs.locationLiveUpdates) {
      setFollowMe(true);
    } else {
      setFollowMe(false);
    }
    setNavStepIndex(0);
    setSelectedStationForRoute(station);
    setShowRoute(true);
    setShowDirectionsPanel(false);
    setRouteInfos([]);
    setSelectedRouteIndex(0);
    // Give the map + polyline room; user can drag the sheet up to pick another station.
    setSheetState("collapsed");
  };

  const handleRoutesCalculated = useCallback((routes: RouteInfo[]) => {
    setRouteInfos(routes);
  }, []);

  const handleClearRoute = () => {
    setShowRoute(false);
    setSelectedStationForRoute(null);
    setDirectionsOrigin(null);
    setRouteInfos([]);
    setSelectedRouteIndex(0);
    setNavStepIndex(0);
    setShowDirectionsPanel(false);
    mapRef.current?.clearRoute();
    setSheetState("half");
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

  const currentNavStep = showRoute && routeInfo ? routeInfo.steps[navStepIndex] : undefined;
  const nextNavStep = showRoute && routeInfo ? routeInfo.steps[navStepIndex + 1] : undefined;
  const distToCurrentStepEndM =
    currentNavStep?.end_location != null
      ? calculateDistanceKm(
          mapDisplayPosition.lat,
          mapDisplayPosition.lng,
          currentNavStep.end_location.lat(),
          currentNavStep.end_location.lng()
        ) * 1000
      : null;

  return (
    <div className="absolute inset-0 min-h-0 flex flex-col">
      {/* Map */}
      <div className="absolute inset-0 min-h-0">
        <GoogleMapBackground
          ref={mapRef}
          userLocation={mapDisplayPosition}
          markers={listStations}
          zoom={13}
          onPinSelect={handleStationSelectForRoute}
          selectedStation={selectedStationForRoute}
          showRoute={showRoute}
          showTraffic={showTraffic}
          selectedRouteIndex={selectedRouteIndex}
          onRoutesCalculated={handleRoutesCalculated}
          directionsOrigin={directionsOrigin}
          followUser={followMe}
          userHeading={followMe ? liveHeading : null}
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
                <p
                  className="text-orange-400 text-[10px] mt-0.5"
                  title="Browser could not read your position (check site location permission, macOS Location Services, or try again). Map uses Dublin as a fallback."
                >
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

          {!mapHintDismissed && (
            <div className="rounded-xl border border-[#00E0C6]/20 bg-[#0D0F14]/95 px-3 py-2.5 text-[11px] text-white/55 leading-relaxed flex gap-2 items-start shadow-lg">
              <span className="text-[#00E0C6] shrink-0" aria-hidden>
                ℹ
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-white/75 font-medium">Fuel</span> stations come from{" "}
                <span className="text-white/80">Google Places</span>.{" "}
                <span className="text-white/75 font-medium">EV</span> chargers come from{" "}
                <span className="text-white/80">Open Charge Map</span> — different sources, like
                Google Maps vs plug-in data.
              </div>
              <button
                type="button"
                onClick={() => {
                  localStorage.setItem("waysave_map_source_hint_v1", "1");
                  setMapHintDismissed(true);
                }}
                className="shrink-0 text-[10px] font-semibold text-[#00E0C6] hover:text-[#5eead4]"
              >
                Got it
              </button>
            </div>
          )}
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
                  <p className="text-white/60 text-xs line-clamp-2">
                    To {selectedStationForRoute.name}
                  </p>
                  <p className="text-white/35 text-[10px] mt-1 leading-snug">
                    Route options follow your{" "}
                    <span className="capitalize text-white/45">{prefs.preference}</span> preference
                    {prefs.maxDistanceKm > 0 ? (
                      <> · list within {prefs.maxDistanceKm} km</>
                    ) : null}
                    .
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

            {/* Live turn-by-turn: step advances from GPS */}
            {routeInfo.steps.length > 0 && currentNavStep && (
              <div className="px-4 py-3 border-b border-[#00E0C6]/25 bg-gradient-to-br from-[#00E0C6]/12 to-transparent">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#00E0C6]/90 mb-2">
                  {followMe ? "Live navigation" : "Next turn"}
                </p>
                <div className="flex gap-3 items-start">
                  <span className="text-3xl leading-none mt-0.5" aria-hidden>
                    {maneuverIcon(currentNavStep.maneuver)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[15px] font-semibold leading-snug">
                      {stripHtml(currentNavStep.instructions)}
                    </p>
                    {distToCurrentStepEndM != null && (
                      <p className="text-[#00E0C6]/90 text-sm font-medium mt-1.5 tabular-nums">
                        {formatNavDistanceMeters(distToCurrentStepEndM)} along this step
                      </p>
                    )}
                  </div>
                </div>
                {nextNavStep && (
                  <p className="text-white/45 text-xs mt-3 pl-10 border-t border-white/5 pt-2">
                    Then: {stripHtml(nextNavStep.instructions)}
                  </p>
                )}
                {!followMe && (
                  <p className="text-[10px] text-amber-400/90 mt-2">
                    Tap the crosshair button on the map to follow your live GPS while driving.
                  </p>
                )}
              </div>
            )}

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
          onClick={handleToggleFollowMe}
          disabled={!prefs.locationLiveUpdates}
          title={
            prefs.locationLiveUpdates
              ? undefined
              : "Turn on “Live location updates” in Settings to use follow mode"
          }
          className={`
            w-12 h-12 shrink-0 rounded-full pointer-events-auto
            backdrop-blur-md border transition shadow-lg
            flex items-center justify-center
            disabled:opacity-40 disabled:cursor-not-allowed
            ${
              followMe
                ? "bg-[#00E0C6]/25 border-[#00E0C6]/50"
                : "bg-[#0D0F14]/90 border-white/10"
            }
          `}
          aria-pressed={followMe}
          aria-label={followMe ? "Stop following my location" : "Follow my location while driving"}
        >
          <LocateFixed
            className={`w-5 h-5 ${followMe ? "text-[#00E0C6]" : "text-white/90"}`}
          />
        </button>

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
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-white font-semibold flex items-center gap-2">
                      {listStations.length} Station{listStations.length !== 1 ? "s" : ""}
                      {favoritesOnly ? " · favourites" : ""}
                      {sheetState === "expanded" && (
                        <ChevronDown className="w-4 h-4 text-white/50 shrink-0" />
                      )}
                      {sheetState === "collapsed" && (
                        <ChevronUp className="w-4 h-4 text-white/50 shrink-0" />
                      )}
                    </p>
                    <p className="text-white/50 text-xs">
                      {prefs.preference === "nearest"
                        ? "Nearest first"
                        : prefs.preference === "cheapest"
                          ? "Best value first"
                          : "Fastest route first"}
                    </p>
                    {cheapestHint && (
                      <p className="text-[10px] text-emerald-300/90 mt-1 truncate" title={cheapestHint.name}>
                        Top pick: €{cheapestHint.price.toFixed(2)}/L · {cheapestHint.name}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {user && (
                      <button
                        type="button"
                        onClick={() => setFavoritesOnly((v) => !v)}
                        aria-pressed={favoritesOnly}
                        title={favoritesOnly ? "Show all stations" : "Favourites only"}
                        className={`
                          w-9 h-9 rounded-lg flex items-center justify-center transition
                          ${
                            favoritesOnly
                              ? "bg-rose-500/25 border border-rose-400/40 text-rose-200"
                              : "bg-white/5 hover:bg-white/10 border border-white/10 text-white/70"
                          }
                        `}
                      >
                        <Heart
                          className={`w-4 h-4 ${favoritesOnly ? "fill-current" : ""}`}
                          aria-hidden
                        />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => bumpListRefresh()}
                      disabled={(loadingEV && activeTab === "ev") || (loadingFuel && activeTab === "fuel")}
                      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition disabled:opacity-40"
                      aria-label="Refresh station list"
                      title="Refresh list"
                    >
                      <RefreshCw
                        className={`w-4 h-4 text-white/80 ${(loadingEV && activeTab === "ev") || (loadingFuel && activeTab === "fuel") ? "animate-spin" : ""}`}
                      />
                    </button>
                    {searchQuery && (
                      <p className="text-white/50 text-xs bg-white/5 px-2 py-1 rounded-lg max-w-[5rem] truncate">
                        "{searchQuery}"
                      </p>
                    )}
                    <button
                      type="button"
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
              <div
                ref={listScrollParentRef}
                className="flex-1 overflow-y-auto px-4 py-3 min-h-0"
              >
                {((activeTab === "ev" && evError) || (activeTab === "fuel" && fuelError)) && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3 space-y-2">
                    <p className="text-red-400 text-sm">
                      {activeTab === "ev" ? evError : fuelError}
                    </p>
                    <button
                      type="button"
                      onClick={() => bumpListRefresh()}
                      className="text-sm font-semibold text-[#00E0C6] hover:text-[#5eead4]"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {((loadingEV && activeTab === "ev") || (loadingFuel && activeTab === "fuel")) && (
                  <StationListSkeleton rows={6} />
                )}

                {!loadingEV &&
                  !loadingFuel &&
                  listStations.length === 0 &&
                  !(activeTab === "ev" && evError) &&
                  !(activeTab === "fuel" && fuelError) && (
                    <div className="text-center text-white/50 text-sm py-8">
                      <p className="mb-3">
                        {searchQuery.trim()
                          ? `No stations match "${searchQuery}"`
                          : favoritesOnly && user && favoriteIds.size === 0
                            ? "You have no saved favourites yet. Open a station and tap the heart."
                            : favoritesOnly && rankedStations.length > 0
                              ? "No favourites in this list — try turning off the heart filter or widen filters."
                              : "No stations match your filters"}
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          type="button"
                          onClick={onFiltersClick}
                          className="px-4 py-2 bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] rounded-xl font-semibold text-sm"
                        >
                          Adjust Filters
                        </button>
                        {favoritesOnly && (
                          <button
                            type="button"
                            onClick={() => setFavoritesOnly(false)}
                            className="px-4 py-2 rounded-xl border border-white/15 text-white/80 text-sm font-medium hover:bg-white/5"
                          >
                            Show all stations
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                {!loadingEV &&
                  !loadingFuel &&
                  listStations.length > 0 &&
                  !(activeTab === "ev" && evError) &&
                  !(activeTab === "fuel" && fuelError) && (
                    <div
                      className="relative w-full"
                      style={{ height: rowVirtualizer.getTotalSize() }}
                    >
                      {rowVirtualizer.getVirtualItems().map((vi) => {
                        const station = listStations[vi.index];
                        const routeActive =
                          selectedStationForRoute?.id === station.id && showRoute;
                        return (
                          <div
                            key={station.id}
                            data-index={vi.index}
                            ref={rowVirtualizer.measureElement}
                            className="absolute left-0 top-0 w-full flex gap-2 items-stretch pb-2"
                            style={{ transform: `translateY(${vi.start}px)` }}
                          >
                            <div className="flex-1 min-w-0">
                              <StationCard
                                station={station}
                                index={vi.index}
                                prefs={prefs}
                                onPress={() => onStationClick(station)}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStationSelectForRoute(station)}
                              title={routeActive ? "Route active" : "Directions to this station"}
                              aria-label={
                                routeActive
                                  ? "Route active — tap to refresh selection"
                                  : "Show route to this station"
                              }
                              className={`
                          shrink-0 min-h-[4.75rem] w-[3.35rem] rounded-2xl flex flex-col items-center justify-center gap-0.5
                          text-[10px] font-semibold leading-tight px-1 transition
                          ${
                            routeActive
                              ? "bg-gradient-to-br from-[#00E0C6] to-[#0097FF] text-[#0D0F14] shadow-[0_0_16px_rgba(0,224,198,0.25)]"
                              : "bg-white/[0.06] hover:bg-white/10 border border-white/10 text-white/90"
                          }
                        `}
                            >
                              <Navigation className="w-[18px] h-[18px]" aria-hidden />
                              {routeActive ? "On" : "Go"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            )}

            {/* COLLAPSED STATE MESSAGE */}
            {sheetState === "collapsed" && (
              <div className="flex-1 flex items-center justify-center text-white/45 text-xs px-4 text-center">
                <p>
                  {showRoute
                    ? "Swipe up to browse stations or change destination"
                    : "👆 Drag up to view stations"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Route active: peek button to expand station list */}
      {showList && showRoute && sheetState === "collapsed" && !showDirectionsPanel && (
        <button
          type="button"
          onClick={() => setSheetState("half")}
          className="
            absolute bottom-[6.75rem] left-4 z-30
            pointer-events-auto
            flex items-center gap-2 px-3 py-2.5 rounded-2xl
            bg-[#0D0F14]/95 backdrop-blur-md border border-[#00E0C6]/35
            text-white text-sm font-semibold shadow-lg
            hover:bg-[#151a24] active:scale-[0.99] transition
          "
          aria-label="Expand station list"
        >
          <List className="w-4 h-4 text-[#00E0C6]" aria-hidden />
          Stations
        </button>
      )}

      {/* SHOW LIST BUTTON - When hidden */}
      {!showList && !showDirectionsPanel && (
        <button
          type="button"
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
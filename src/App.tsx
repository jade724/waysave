// src/App.tsx

import { useEffect, useMemo, useState } from "react";

import MobileFrame from "./components/layout/MobileFrame";
import SplashScreen from "./components/screens/SplashScreen";
import LoginScreen from "./components/screens/LoginScreen";
import SignupScreen from "./components/screens/SignupScreen";
import HomeScreen from "./components/screens/HomeScreen";
import MapScreen from "./components/screens/MapScreen";
import FilterScreen from "./components/screens/FilterScreen";
import ProfileScreen from "./components/screens/ProfileScreen";
import StationDetailsScreen from "./components/screens/StationDetailsScreen";
import StationUpdateSubmittedScreen from "./components/screens/StationUpdateSubmittedScreen";
import FavoritesScreen from "./components/screens/FavouritesScreen";
import SettingsScreen from "./components/screens/SettingsScreen";
import BottomNav from "./components/layout/BottomNav";

import { useAuth } from "./lib/authContext";
import { loadPrefs, savePrefs, type UserPreferences } from "./lib/preferences";

/**
 * 🚗 STATION INTERFACE - Enhanced with Route Information
 * ========================================================
 * This interface represents a fuel or EV charging station with all its properties.
 * 
 * 🆕 NEW PROPERTIES ADDED:
 * - driving_time_minutes: Actual driving time from Google Maps Directions API
 * - driving_distance_km: Actual road distance (vs straight-line Haversine distance)
 * - route_polyline: Encoded route path for display
 */
export interface Station {
  id: string;                    // Unique identifier for the station
  externalId?: string;           // ID from external API (OpenChargeMap, etc.)
  name: string;                  // Display name of the station
  lat: number;                   // Latitude coordinate
  lng: number;                   // Longitude coordinate
  type: "fuel" | "ev";          // Station type: fuel or electric vehicle
  
  // 🔹 HAVERSINE DISTANCE (Straight-line "as the crow flies")
  distance_km?: number;          // Calculated using Haversine Formula
  
  // 🔹 🆕 NEW: ACTUAL DRIVING DATA (from Google Maps APIs)
  driving_time_minutes?: number; // Real driving time from Directions API
  driving_distance_km?: number;  // Actual road distance (longer than straight-line)
  route_polyline?: string;       // Encoded polyline for route visualization
  
  score?: number;                // Overall ranking score (future use)
  price_label?: string;          // Human-readable price (e.g., "€1.45/L")
  price_value?: number | null;   // Numeric price value for calculations
  raw?: any;                     // Raw API response data
}

// All possible screens in the app (used for routing with state).
export type Screen =
  | "splash"
  | "login"
  | "signup"
  | "home"
  | "map"
  | "filters"
  | "profile"
  | "favourites"
  | "settings"
  | "station-details"
  | "station-update-submitted";

// Screens that only authenticated users can see.
const SCREENS_REQUIRING_AUTH = new Set<Screen>([
  "home",
  "map",
  "filters",
  "profile",
  "favourites",
  "settings",
  "station-details",
  "station-update-submitted",
]);

// Screens that only guests (not logged in) should see.
const SCREENS_FOR_GUESTS_ONLY = new Set<Screen>(["splash", "login", "signup"]);

export default function App() {
  const { session, loading } = useAuth();

  // User preferences are loaded once on startup.
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPrefs());

  // Save preferences both in state and localStorage.
  const applyPrefs = async (next: UserPreferences) => {
    setPrefs(next);
    savePrefs(next);
  };

  // UI navigation is driven by a single screen state.
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>("map");
  const [splashFinished, setSplashFinished] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  // Use memo so this value only changes when `session` changes.
  const isAuthed = useMemo(() => !!session, [session]);

  // Show splash screen for a short, fixed time.
  useEffect(() => {
    const t = setTimeout(() => setSplashFinished(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Route guard: keep users on valid screens based on auth.
  useEffect(() => {
    if (!splashFinished) return;
    if (loading) return;

    // guest trying to access authed pages
    if (!isAuthed && SCREENS_REQUIRING_AUTH.has(screen)) {
      setScreen("login");
      return;
    }

    // authed user trying to access guest screens
    if (isAuthed && SCREENS_FOR_GUESTS_ONLY.has(screen)) {
      setScreen("home");
      return;
    }

    // initial landing
    if (screen === "splash") {
      setScreen(isAuthed ? "home" : "login");
    }
  }, [screen, splashFinished, loading, isAuthed]);

  // Open the station details screen with a selected station.
  const openStationDetails = (station: Station) => {
    setPreviousScreen(screen);
    setSelectedStation(station);
    setScreen("station-details");
  };

  // Reset sensitive state when logging out.
  const handleLoggedOut = () => {
    setSelectedStation(null);
    setScreen("login");
  };

  // Enhanced navigation with transition support
  const handleNavigate = (newScreen: Screen) => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen(newScreen);
      setTransitioning(false);
    }, 150);
  };

  return (
    <MobileFrame>
      {/* Screen Transition Wrapper */}
      <div
        className={`
          w-full h-full transition-opacity duration-150
          ${transitioning ? "opacity-0" : "opacity-100"}
        `}
      >
        {/* Each screen is conditionally rendered based on `screen` */}
        {screen === "splash" && <SplashScreen />}

        {screen === "login" && (
          <LoginScreen
            onLogin={() => handleNavigate("home")}
            onSignup={() => handleNavigate("signup")}
          />
        )}

        {screen === "signup" && (
          <SignupScreen
            onBack={() => handleNavigate("login")}
            onSignupSuccess={() => handleNavigate("home")}
          />
        )}

        {screen === "home" && (
          <HomeScreen
            onOpenMap={() => handleNavigate("map")}
            onOpenFilters={() => handleNavigate("filters")}
            onOpenFavorites={() => handleNavigate("favourites")}
          />
        )}

        {screen === "map" && (
          <MapScreen
            prefs={prefs}
            onPrefsChange={applyPrefs}
            onFiltersClick={() => handleNavigate("filters")}
            onStationClick={openStationDetails}
            onPinSelect={openStationDetails}
            onLoggedOut={handleLoggedOut}
          />
        )}

        {screen === "filters" && (
          <FilterScreen
            initial={prefs}
            onApply={applyPrefs}
            onClose={() => handleNavigate("map")}
          />
        )}

        {screen === "profile" && (
          <ProfileScreen onLoggedOut={handleLoggedOut} 
          onOpenFavorites={() => handleNavigate("favourites")}
          onOpenSettings={() => handleNavigate("settings")}
          />
        )}

        {screen === "favourites" && (
          <FavoritesScreen
          onBack={() => handleNavigate("home")}
          onStationClick={openStationDetails}
          />
        )}

        {screen === "settings" && (
         <SettingsScreen
            onBack={() => handleNavigate("profile")}
            prefs={prefs}
            onPrefsChange={applyPrefs}
          />
        )}

        {screen === "station-details" && selectedStation && (
          <StationDetailsScreen
            station={selectedStation}
            onBack={() => handleNavigate(previousScreen)}
            onSubmitUpdate={() => handleNavigate("station-update-submitted")}
          />
        )}

        {screen === "station-update-submitted" && (
          <StationUpdateSubmittedScreen onBack={() => handleNavigate("map")} />
        )}

        {isAuthed && !["splash", "login", "signup"].includes(screen) && (
          <BottomNav current={screen} onNavigate={handleNavigate} />
        )}
      </div>

      {/* Optional: Global Loading Overlay */}
      {loading && screen !== "splash" && (
        <div className="fixed inset-0 bg-[#0D0F14]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-12 h-12 border-4 border-[#00E0C6] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-white/60">Loading...</p>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
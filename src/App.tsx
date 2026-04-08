// src/App.tsx

import { useEffect, useMemo, useState } from "react";

import type { Station } from "./types/station";

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

export type { Station } from "./types/station";

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

  /** Auth-aware screen: avoids setState in an effect for route guarding (React 19 lint). */
  const displayScreen = useMemo((): Screen => {
    if (!splashFinished) return "splash";
    if (loading) {
      if (screen === "splash") return "splash";
      return screen;
    }
    if (!isAuthed && SCREENS_REQUIRING_AUTH.has(screen)) return "login";
    if (isAuthed && SCREENS_FOR_GUESTS_ONLY.has(screen)) return "home";
    if (screen === "splash") return isAuthed ? "home" : "login";
    return screen;
  }, [screen, splashFinished, loading, isAuthed]);

  // Open the station details screen with a selected station.
  const openStationDetails = (station: Station) => {
    setPreviousScreen(displayScreen);
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
        {/* Each screen is conditionally rendered from auth-aware `displayScreen` */}
        {displayScreen === "splash" && <SplashScreen />}

        {displayScreen === "login" && (
          <LoginScreen
            onLogin={() => handleNavigate("home")}
            onSignup={() => handleNavigate("signup")}
          />
        )}

        {displayScreen === "signup" && (
          <SignupScreen
            onBack={() => handleNavigate("login")}
            onSignupSuccess={() => handleNavigate("home")}
          />
        )}

        {displayScreen === "home" && (
          <HomeScreen
            onOpenMap={() => handleNavigate("map")}
            onOpenFilters={() => handleNavigate("filters")}
            onOpenFavorites={() => handleNavigate("favourites")}
          />
        )}

        {displayScreen === "map" && (
          <MapScreen
            prefs={prefs}
            onPrefsChange={applyPrefs}
            onFiltersClick={() => handleNavigate("filters")}
            onStationClick={openStationDetails}
            onPinSelect={openStationDetails}
            onLoggedOut={handleLoggedOut}
          />
        )}

        {displayScreen === "filters" && (
          <FilterScreen
            initial={prefs}
            onApply={applyPrefs}
            onClose={() => handleNavigate("map")}
          />
        )}

        {displayScreen === "profile" && (
          <ProfileScreen onLoggedOut={handleLoggedOut} 
          onOpenFavorites={() => handleNavigate("favourites")}
          onOpenSettings={() => handleNavigate("settings")}
          />
        )}

        {displayScreen === "favourites" && (
          <FavoritesScreen
          onBack={() => handleNavigate("home")}
          onStationClick={openStationDetails}
          />
        )}

        {displayScreen === "settings" && (
         <SettingsScreen
            onBack={() => handleNavigate("profile")}
            prefs={prefs}
            onPrefsChange={applyPrefs}
          />
        )}

        {displayScreen === "station-details" && selectedStation && (
          <StationDetailsScreen
            station={selectedStation}
            onBack={() => handleNavigate(previousScreen)}
            onSubmitUpdate={() => handleNavigate("station-update-submitted")}
          />
        )}

        {displayScreen === "station-update-submitted" && (
          <StationUpdateSubmittedScreen onBack={() => handleNavigate("map")} />
        )}

        {isAuthed && !["splash", "login", "signup"].includes(displayScreen) && (
          <BottomNav current={displayScreen} onNavigate={handleNavigate} />
        )}
      </div>

      {/* Optional: Global Loading Overlay */}
      {loading && displayScreen !== "splash" && (
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
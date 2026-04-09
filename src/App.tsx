// src/App.tsx

import { lazy, Suspense, useEffect, useMemo, useState } from "react";

import type { Station } from "./types/station";

import MobileFrame from "./components/layout/MobileFrame";
import PwaUpdateNotifier from "./components/PwaUpdateNotifier";
import SplashScreen from "./components/screens/SplashScreen";
import LoginScreen from "./components/screens/LoginScreen";
import SignupScreen from "./components/screens/SignupScreen";
import HomeScreen from "./components/screens/HomeScreen";
import BottomNav from "./components/layout/BottomNav";

const MapScreen = lazy(() => import("./components/screens/MapScreen"));
const FilterScreen = lazy(() => import("./components/screens/FilterScreen"));
const ProfileScreen = lazy(() => import("./components/screens/ProfileScreen"));
const StationDetailsScreen = lazy(() => import("./components/screens/StationDetailsScreen"));
const StationUpdateSubmittedScreen = lazy(
  () => import("./components/screens/StationUpdateSubmittedScreen")
);
const FavoritesScreen = lazy(() => import("./components/screens/FavouritesScreen"));
const SettingsScreen = lazy(() => import("./components/screens/SettingsScreen"));

import { useAuth } from "./lib/authContext";
import { loadPrefs, savePrefs, type UserPreferences } from "./lib/preferences";

export type { Station } from "./types/station";

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

const SCREENS_FOR_GUESTS_ONLY = new Set<Screen>(["splash", "login", "signup"]);

function RouteLoading() {
  return (
    <div className="w-full h-full min-h-[40vh] flex flex-col items-center justify-center bg-[#0D0F14] gap-3">
      <div
        className="w-10 h-10 border-2 border-[#00E0C6] border-t-transparent rounded-full animate-spin"
        aria-hidden
      />
      <p className="text-sm text-white/50">Loading…</p>
    </div>
  );
}

export default function App() {
  const { session, loading } = useAuth();

  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPrefs());

  const applyPrefs = async (next: UserPreferences) => {
    setPrefs(next);
    savePrefs(next);
  };

  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [previousScreen, setPreviousScreen] = useState<Screen>("map");
  const [splashFinished, setSplashFinished] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const isAuthed = useMemo(() => !!session, [session]);

  useEffect(() => {
    const t = setTimeout(() => setSplashFinished(true), 1200);
    return () => clearTimeout(t);
  }, []);

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

  const openStationDetails = (station: Station) => {
    setPreviousScreen(displayScreen);
    setSelectedStation(station);
    setScreen("station-details");
  };

  const handleLoggedOut = () => {
    setSelectedStation(null);
    setScreen("login");
  };

  const handleNavigate = (newScreen: Screen) => {
    setTransitioning(true);
    setTimeout(() => {
      setScreen(newScreen);
      setTransitioning(false);
    }, 150);
  };

  return (
    <MobileFrame>
      <PwaUpdateNotifier />
      <div
        className={`
          w-full flex-1 min-h-0 flex flex-col relative
          transition-opacity duration-150
          ${transitioning ? "opacity-0" : "opacity-100"}
        `}
      >
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
            prefs={prefs}
            onOpenMap={() => handleNavigate("map")}
            onOpenFilters={() => handleNavigate("filters")}
            onOpenFavorites={() => handleNavigate("favourites")}
          />
        )}

        <Suspense fallback={<RouteLoading />}>
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
            <ProfileScreen
              prefs={prefs}
              onLoggedOut={handleLoggedOut}
              onOpenFavorites={() => handleNavigate("favourites")}
              onOpenSettings={() => handleNavigate("settings")}
              onOpenFilters={() => handleNavigate("filters")}
              onOpenMap={() => handleNavigate("map")}
              onOpenHome={() => handleNavigate("home")}
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
        </Suspense>
      </div>

      {isAuthed && !["splash", "login", "signup"].includes(displayScreen) && (
        <BottomNav current={displayScreen} onNavigate={handleNavigate} />
      )}

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

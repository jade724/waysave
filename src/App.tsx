// src/App.tsx

import { useEffect, useState } from "react";

import MobileFrame from "./components/layout/MobileFrame";
import SplashScreen from "./components/screens/SplashScreen";
import LoginScreen from "./components/screens/LoginScreen";
import SignupScreen from "./components/screens/SignupScreen";
import HomeMapScreen from "./components/screens/HomeMapScreen";
import FilterScreen from "./components/screens/FilterScreen";
import StationDetailsScreen from "./components/screens/StationDetailsScreen";
import StationUpdateSubmittedScreen from "./components/screens/StationUpdateSubmittedScreen";
import BottomNav from "./components/layout/BottomNav";

import { useAuth } from "./lib/authContext";
import {
  loadPrefs,
  savePrefs,
  type UserPreferences,
} from "./lib/preferences";

// Shared station model used by fuel and EV data
export interface Station {
  id: string;
  externalId?: string;
  name: string;
  lat: number;
  lng: number;
  type: "fuel" | "ev";

  distance_km?: number;
  score?: number;

  price_label?: string;
  price_value?: number | null;

  raw?: any;
}

export type Screen =
  | "splash"
  | "login"
  | "signup"
  | "home"
  | "filters"
  | "station-details"
  | "station-update-submitted";

const SCREENS_REQUIRING_AUTH = new Set<Screen>([
  "home",
  "filters",
  "station-details",
  "station-update-submitted",
]);

const SCREENS_FOR_GUESTS_ONLY = new Set<Screen>([
  "splash",
  "login",
  "signup",
]);

export default function App() {
  const { session, loading } = useAuth();

  // User preferences (persisted)
  const [prefs, setPrefs] = useState<UserPreferences>(() => loadPrefs());

  const applyPrefs = (next: UserPreferences) => {
    setPrefs(next);
    savePrefs(next);
  };

  // Navigation state
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [splashFinished, setSplashFinished] = useState(false);

  // Dev-only auth bypass
  const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";
  const isAuthed = SKIP_AUTH || !!session;

  // Splash delay
  useEffect(() => {
    const t = setTimeout(() => setSplashFinished(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Route guard based on auth state
  useEffect(() => {
    if (!splashFinished) return;
    if (loading && !SKIP_AUTH) return;

    if (!isAuthed && SCREENS_REQUIRING_AUTH.has(screen)) {
      setScreen("login");
      return;
    }

    if (isAuthed && SCREENS_FOR_GUESTS_ONLY.has(screen)) {
      setScreen("home");
      return;
    }

    if (screen === "splash") {
      setScreen(isAuthed ? "home" : "login");
    }
  }, [screen, splashFinished, loading, isAuthed, SKIP_AUTH]);

  const openStationDetails = (station: Station) => {
    setSelectedStation(station);
    setScreen("station-details");
  };

  return (
    <MobileFrame>
      {screen === "splash" && <SplashScreen />}

      {screen === "login" && (
        <LoginScreen
          onLogin={() => setScreen("home")}
          onSignup={() => setScreen("signup")}
        />
      )}

      {screen === "signup" && (
        <SignupScreen
          onBack={() => setScreen("login")}
          onSignupSuccess={() => setScreen("home")}
        />
      )}

      {screen === "home" && (
        <HomeMapScreen
          prefs={prefs}
          onPrefsChange={applyPrefs}
          onFiltersClick={() => setScreen("filters")}
          onStationClick={openStationDetails}
          onPinSelect={openStationDetails}
        />
      )}

      {screen === "filters" && (
        <FilterScreen
          initial={prefs}
          onApply={applyPrefs}
          onClose={() => setScreen("home")}
        />
      )}

      {screen === "station-details" && selectedStation && (
        <StationDetailsScreen
          station={selectedStation}
          onBack={() => setScreen("home")}
          onSubmitUpdate={() => setScreen("station-update-submitted")}
        />
      )}

      {screen === "station-update-submitted" && (
        <StationUpdateSubmittedScreen
          onBackToHome={() => setScreen("home")}
        />
      )}

      {isAuthed &&
        !["splash", "login", "signup"].includes(screen) && (
          <BottomNav current={screen} onNavigate={setScreen} />
        )}
    </MobileFrame>
  );
}

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

export interface Station {
  id?: number;
  name: string;
  lat: number;
  lng:  number;
  distance?: number;
  price?: string;
  detour?: string;
  type: "fuel" | "ev";
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

const SCREENS_FOR_GUESTS_ONLY = new Set<Screen>(["splash", "login", "signup"]);

export default function App() {
  const { session, loading } = useAuth();

  // 🔧 DEV MODE: Skip auth for UI testing (REMOVE BEFORE PRODUCTION)
  const SKIP_AUTH = import.meta.env.VITE_SKIP_AUTH === "true";
  const isAuthed = SKIP_AUTH || !!session;

  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [splashFinished, setSplashFinished] = useState(false);

  // Keep your nice splash timing, but DO NOT force login anymore.
  useEffect(() => {
    const t = window.setTimeout(() => setSplashFinished(true), 1500);
    return () => window.clearTimeout(t);
  }, []);

  // Phase 2 route guard
  useEffect(() => {
    if (!splashFinished) return;
    if (loading && ! SKIP_AUTH) return; // Skip loading check in dev mode

    // Logged out → block protected screens
    if (! isAuthed && SCREENS_REQUIRING_AUTH.has(screen)) {
      setSelectedStation(null);
      setScreen("login");
      return;
    }

    // Logged in → block guest-only screens
    if (isAuthed && SCREENS_FOR_GUESTS_ONLY.has(screen)) {
      setScreen("home");
      return;
    }

    // Splash finished → decide initial screen
    if (screen === "splash") {
      setScreen(isAuthed ? "home" : "login");
    }
  }, [splashFinished, loading, isAuthed, screen, SKIP_AUTH]);

  const openStationDetails = (station: Station) => {
    setSelectedStation(station);
    setScreen("station-details");
  };

  return (
    <MobileFrame>
      {/* DEV MODE INDICATOR */}
      {SKIP_AUTH && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-1 text-xs font-bold z-50">
          ⚠️ DEV MODE: Auth disabled
        </div>
      )}

      {/* SCREENS */}
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
          onFiltersClick={() => setScreen("filters")}
          onStationClick={openStationDetails}
          onPinSelect={openStationDetails}
        />
      )}

      {screen === "filters" && (
        <FilterScreen onClose={() => setScreen("home")} />
      )}

      {screen === "station-details" && selectedStation && (
        <StationDetailsScreen
          station={selectedStation}
          onBack={() => setScreen("home")}
          onSubmitUpdate={() => setScreen("station-update-submitted")}
        />
      )}

      {screen === "station-update-submitted" && (
        <StationUpdateSubmittedScreen onBackToHome={() => setScreen("home")} />
      )}

      {/* BOTTOM NAV */}
      {isAuthed &&
        screen !== "splash" &&
        screen !== "login" &&
        screen !== "signup" && <BottomNav current={screen} onNavigate={setScreen} />}
    </MobileFrame>
  );
}
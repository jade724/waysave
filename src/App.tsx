import { useState, useEffect } from "react";

import MobileFrame from "./components/layout/MobileFrame";

import SplashScreen from "./components/screens/SplashScreen";
import LoginScreen from "./components/screens/LoginScreen";
import SignupScreen from "./components/screens/SignupScreen";
import HomeMapScreen from "./components/screens/HomeMapScreen";
import FilterScreen from "./components/screens/FilterScreen";
import StationDetailsScreen from "./components/screens/StationDetailsScreen";
import StationUpdateSubmittedScreen from "./components/screens/StationUpdateSubmittedScreen";

import BottomNav from "./components/layout/BottomNav";



export interface Station {
  id?: number;
  name: string;
  lat: number;
  lng: number;
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

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setScreen("login");
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  const openStationDetails = (station: Station) => {
    setSelectedStation(station);
    setScreen("station-details");
  };

  return (
    <MobileFrame>
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
        <StationUpdateSubmittedScreen
          onBackToHome={() => setScreen("home")}
        />
      )}

      {/* BOTTOM NAV */}
      {screen !== "splash" && screen !== "login" && screen !== "signup" && (
        <BottomNav current={screen} onNavigate={setScreen} />
      )}
    </MobileFrame>
  );
}


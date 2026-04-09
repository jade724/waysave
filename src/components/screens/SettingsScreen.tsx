// src/components/screens/SettingsScreen.tsx
// User preferences and app settings - wired to preference

import { useEffect, useState } from "react";
import { ArrowLeft, Moon, MapPin, Gauge, Bell, Globe, LocateFixed } from "lucide-react";
import type { UserPreferences } from "../../lib/preferences";
import { useToast } from "../../lib/toastContext";
import { devLog } from "../../lib/logger";

interface Props {
  onBack: () => void;
  prefs: UserPreferences;
  onPrefsChange: (next: UserPreferences) => void;
}

function initialLocationPermissionLabel(): string {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return "Not available in this browser";
  }
  if (!navigator.permissions?.query) {
    return "Status not reported — use “Test” below";
  }
  return "…";
}

export default function SettingsScreen({ onBack, prefs, onPrefsChange }: Props) {
  const distanceUnit = "km";
  const { showToast } = useToast();
  const [locationPermissionLabel, setLocationPermissionLabel] = useState(initialLocationPermissionLabel);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    const perm = navigator.permissions?.query?.bind(navigator.permissions);
    if (!perm) return;
    perm({ name: "geolocation" as PermissionName })
      .then((status) => {
        const label =
          status.state === "granted"
            ? "Allowed — your position can be used"
            : status.state === "denied"
              ? "Blocked — enable in browser or system settings"
              : "Not set yet — you’ll be asked when WaySave needs location";
        setLocationPermissionLabel(label);
        status.onchange = () => {
          const s = status.state;
          setLocationPermissionLabel(
            s === "granted"
              ? "Allowed — your position can be used"
              : s === "denied"
                ? "Blocked — enable in browser or system settings"
                : "Not set yet — you’ll be asked when WaySave needs location"
          );
        };
      })
      .catch(() => setLocationPermissionLabel("Could not read permission status"));
  }, []);

  const testLocationFix = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not available in this environment.", "error");
      return;
    }
    showToast("Getting a fresh location fix…", "info");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const acc =
          pos.coords.accuracy != null ? `${Math.round(pos.coords.accuracy)} m` : "unknown";
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        showToast(`${lat}, ${lng} · ±${acc} accuracy`, "success");
        devLog(`Test location: ${lat}, ${lng}, accuracy=${acc}`);
      },
      (err) => {
        showToast(err.message || "Could not read location. Check browser and system location permission.", "error");
      },
      {
        enableHighAccuracy: prefs.locationHighAccuracy,
        maximumAge: 0,
        timeout: 20_000,
      }
    );
  };

  return (
    <div className="w-full h-full bg-[#0D0F14] px-6 pt-7 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white/80" />
        </button>
        <h1 className="text-white text-2xl font-bold">Settings</h1>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">


        {/* Appearance */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <Moon className="w-4 h-4" />
            Appearance
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Dark Mode</p>
                <p className="text-white/50 text-xs">Always on</p>
              </div>
              <div className="w-12 h-6 rounded-full bg-gradient-to-r from-[#00E0C6] to-[#0097FF] relative">
                <div className="absolute top-1 left-7 w-4 h-4 rounded-full bg-white shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Distance */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Distance
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="w-full p-4 flex items-center justify-between">

              <span className="text-white font-semibold">Units</span>
              
              <span className="text-white/50">Kilometers</span>
            </div>
            
            <div className="h-px bg-white/10" />
            
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-semibold">Max Search Distance</span>
                
                <span className="text-[#00E0C6] font-bold tabular-nums">
                  {prefs.maxDistanceKm < 10
                    ? prefs.maxDistanceKm.toFixed(1)
                    : Math.round(prefs.maxDistanceKm)}{" "}
                  {distanceUnit}
                </span>

                </div>
              <input
                type="range"
                min="0.1"
                max="100"
                step="0.1"
                value={prefs.maxDistanceKm}
                onChange={(e) =>
                  onPrefsChange({
                    ...prefs,
                    maxDistanceKm: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-white/10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-5
                  [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-gradient-to-r
                  [&::-webkit-slider-thumb]:from-[#00E0C6]
                  [&::-webkit-slider-thumb]:to-[#0097FF]
                  [&::-webkit-slider-thumb]:cursor-pointer"
              />
              <div className="flex justify-between text-xs text-white/40 mt-2">
                <span>0.1 km</span>
                <span>100 km</span>
              </div>
            </div>
          </div>
        </div>

        {/* Location & GPS */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <LocateFixed className="w-4 h-4" />
            Location
          </h2>

          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <p className="text-white font-semibold">Browser permission</p>
              <p className="text-white/55 text-xs mt-1 leading-relaxed">{locationPermissionLabel}</p>
              <p className="text-white/40 text-[11px] mt-2 leading-relaxed">
                WaySave uses your real GPS when allowed — not a random city. If location is blocked, open
                your browser’s site settings for this page or your phone’s Location services.
              </p>
            </div>

            <div className="p-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-white font-semibold">Test my location now</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Requests a fresh fix using your settings below (same as the map).
                </p>
              </div>
              <button
                type="button"
                onClick={testLocationFix}
                className="shrink-0 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] px-4 py-2.5 text-[#0D0F14] text-sm font-bold"
              >
                Test location
              </button>
            </div>

            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-white font-semibold">High-accuracy GPS</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Use satellite-grade fixes when the device supports it. Recommended for real driving
                  position.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.locationHighAccuracy}
                onClick={() =>
                  onPrefsChange({ ...prefs, locationHighAccuracy: !prefs.locationHighAccuracy })
                }
                className={`w-12 h-7 rounded-full relative shrink-0 transition ${
                  prefs.locationHighAccuracy
                    ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]"
                    : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${
                    prefs.locationHighAccuracy ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 border-b border-white/10 flex items-center justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-white font-semibold">Live location updates</p>
                <p className="text-white/50 text-xs mt-0.5">
                  Continuous GPS while you use the map (follow mode, driving navigation). Turn off to
                  only update when you open the map or tap refresh — saves battery.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.locationLiveUpdates}
                onClick={() =>
                  onPrefsChange({ ...prefs, locationLiveUpdates: !prefs.locationLiveUpdates })
                }
                className={`w-12 h-7 rounded-full relative shrink-0 transition ${
                  prefs.locationLiveUpdates
                    ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]"
                    : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${
                    prefs.locationLiveUpdates ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0 pr-2">
                <p className="text-white font-semibold">Auto-follow when starting a route</p>
                <p className="text-white/50 text-xs mt-0.5">
                  When you start directions to a station, move the map with you automatically. Requires
                  live updates above.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.locationAutoFollowOnRoute}
                disabled={!prefs.locationLiveUpdates}
                onClick={() =>
                  onPrefsChange({
                    ...prefs,
                    locationAutoFollowOnRoute: !prefs.locationAutoFollowOnRoute,
                  })
                }
                className={`w-12 h-7 rounded-full relative shrink-0 transition ${
                  prefs.locationAutoFollowOnRoute && prefs.locationLiveUpdates
                    ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF]"
                    : "bg-white/20"
                } disabled:opacity-40`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition ${
                    prefs.locationAutoFollowOnRoute && prefs.locationLiveUpdates ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <Gauge className="w-4 h-4" />
            Default Preferences
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4">
              <p className="text-white font-semibold mb-3">Sort By</p>
              <div className="grid grid-cols-3 gap-2">
                {(["nearest", "cheapest", "fastest"] as const).map((sort) => (
                  <button
                    type="button"
                    key={sort}
                    role="radio"
                    aria-checked={prefs.preference === sort}
                    onClick={() => onPrefsChange({ ...prefs, preference: sort })}
                    className={`
                      py-2 px-3 rounded-xl text-xs font-semibold capitalize transition
                      ${prefs.preference === sort
                        ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                      }
                    `}
                  >
                    {sort}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="h-px bg-white/10" />
            
            <div className="p-4">
              <p className="text-white font-semibold mb-3">Default Station Type</p>
              <div className="grid grid-cols-2 gap-2">
                {(["fuel", "ev"] as const).map((tab) => (
                  <button
                    type="button"
                    key={tab}
                    role="radio"
                    aria-checked={prefs.activeTab === tab}
                    onClick={() => onPrefsChange({ ...prefs, activeTab: tab })}
                    className={`
                      py-2 px-3 rounded-xl text-xs font-semibold uppercase transition
                      ${prefs.activeTab === tab
                        ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
                        : "bg-white/5 text-white/60 hover:bg-white/10"
                      }
                    `}
                  >
                    {tab === "ev" ? "EV" : "Fuel"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">Price Alerts</p>
                <p className="text-white/50 text-xs">Coming soon</p>
              </div>
              <div className="w-12 h-6 rounded-full bg-white/20 relative opacity-50 cursor-not-allowed">
                <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Language */}
        <div>
          <h2 className="text-white/60 text-sm font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Language
          </h2>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="w-full p-4 flex items-center justify-between">
              <span className="text-white font-semibold">App Language</span>
              <span className="text-white/50">English</span>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20">
          <p className="text-xs text-white/60 leading-relaxed">
            <strong className="text-white/80">WaySave v1.0.0</strong><br />
           Settings are saved to this device.
          </p>
        </div>
      </div>
    </div>
  );
}
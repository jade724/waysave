// src/components/screens/SettingsScreen.tsx
// User preferences and app settings - wired to preference 

import { ArrowLeft, Moon, MapPin, Gauge, Bell, Globe } from "lucide-react";
import type { UserPreferences } from "../../lib/preferences";

interface Props {
  onBack: () => void;
  prefs: UserPreferences;
  onPrefsChange: (next: UserPreferences) => void;
}

export default function SettingsScreen({ onBack, prefs, onPrefsChange }: Props) {
  const distanceUnit = "km";

  return (
    <div className="w-full h-full bg-[#0D0F14] px-6 pt-7 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
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
                
                <span className="text-[#00E0C6] font-bold">
                  {prefs.maxDistanceKm} {distanceUnit}
                </span>

                </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={prefs.maxDistanceKm}
                onChange={(e) =>
                  onPrefsChange({ ...prefs, maxDistanceKm: parseInt(e.target.value) })
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
                <span>5 km</span>
                <span>100 km</span>
              </div>
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
                    key={sort}
                    role="radio"
                    aria-checked={prefs.preference === sort}
                    onClick={() => onPrefsChange({ ...prefs, preference: sort })}
                    className={`
                      py-2 px-3 rounded-xl text-xs font-semibold capitalize transition
                      $ ${prefs.preference === sort
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
            <div className="w-full p-4 flex items-center justify-between"></div>
              <span className="text-white font-semibold">App Language</span>
              <span className="text-white/50">English</span>
            
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
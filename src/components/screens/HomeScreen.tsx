// src/components/screens/HomeScreen.tsx

import { Map, SlidersHorizontal, TrendingDown, Zap, Star } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../../lib/authContext";

// Props tell this screen how to navigate.
interface Props {
  onOpenMap: () => void;
  onOpenFilters: () => void;
  onOpenFavorites: () => void;
}

// Simple helper to greet based on time of day.
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}



export default function HomeScreen({ onOpenMap, onOpenFilters, onOpenFavorites }: Props) {
  const { user } = useAuth();

  
  const greeting = useMemo(() => getGreeting(), []);
  
  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "there";

  
  return (
    <div className="w-full h-full bg-[#0D0F14] px-6 pt-7 pb-24 overflow-y-auto text-white">
      {/* Header */}
      <div className="animate-[fadeIn_0.4s_ease-out] mb-6">
        <h1 className="text-3xl font-bold tracking-tight">WaySave</h1>
        <p className="text-white/50 text-sm mt-1">
          {greeting}, {name}
        </p>
      </div>

      

      {/* Main Actions */}
      <div className="space-y-3">
        <button
          onClick={onOpenMap}
          className="
            w-full py-4 rounded-2xl
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-bold text-lg
            shadow-[0_0_20px_rgba(0,224,198,0.35)]
            active:scale-95 transition-transform
            flex items-center justify-center gap-3
          "
        >
          <Map className="w-6 h-6" />
          Open Map
        </button>

        <button
          onClick={onOpenFilters}
          className="
            w-full py-3 rounded-2xl
            bg-white/5 border border-white/10
            text-white/80 font-semibold
            hover:bg-white/10 transition
            flex items-center justify-center gap-2
          "
        >
          <SlidersHorizontal className="w-5 h-5" />
          Adjust Filters
        </button>
      </div>

      {/* Features Grid */}
      <div className="mt-6 mb-6">
        <h2 className="text-white/80 font-semibold text-sm mb-3">Features</h2>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center mb-3">
              <Map className="w-5 h-5 text-[#0D0F14]" />
            </div>
            <p className="text-white font-semibold text-sm">Live Map</p>
            <p className="text-white/50 text-xs mt-1">Real-time station locations</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-3">
              <TrendingDown className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Best Prices</p>
            <p className="text-white/50 text-xs mt-1">Find cheapest fuel</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center mb-3">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">EV Charging</p>
            <p className="text-white/50 text-xs mt-1">Find charging points</p>
          </div>

          <button
            onClick={onOpenFavorites}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mb-3">
              <Star className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-semibold text-sm">Favorites</p>
            <p className="text-white/50 text-xs mt-1">Save your stations</p>
          </button>
        </div>
      </div>

      {/* Tips Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20">
        <p className="text-sm text-white/80 font-semibold mb-2">💡 Pro Tip</p>
        <p className="text-xs text-white/60 leading-relaxed">
          Use the Map tab for a full-screen view with real-time navigation, 
          and Filters to narrow results by distance, connectors, and ranking.
          Enable location services for the best experience.
        </p>
      </div>
    </div>
  );
}
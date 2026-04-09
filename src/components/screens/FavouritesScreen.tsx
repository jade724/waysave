// src/components/screens/FavoritesScreen.tsx
// Displays user's saved favorite stations

import { ArrowLeft, Heart, Trash2, Navigation, MapPin, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../../lib/authContext";
import { useToast } from "../../lib/toastContext";
import { fetchUserFavorites, removeFavorite } from "../../api/favorites";
import { calculateDistanceKm } from "../../lib/distance";
import type { Station } from "../../types/station";

interface Props {
  onBack: () => void;
  onStationClick: (station: Station) => void;
}

export default function FavoritesScreen({ onBack, onStationClick }: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [favorites, setFavorites] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => {
        // Fallback to Dublin
        setUserLocation({ lat: 53.3498, lng: -6.2603 });
      }
    );
  }, []);

  // Load favorites
  useEffect(() => {
    if (!user?.id) return;

    const loadFavorites = async () => {
      setLoading(true);
      try {
        const data = await fetchUserFavorites(user.id);
        
        // Calculate distances if location available
        if (userLocation) {
          data.forEach((station) => {
            station.distance_km = calculateDistanceKm(
              userLocation.lat,
              userLocation.lng,
              station.lat,
              station.lng
            );
          });
        }

        setFavorites(data);
      } catch (error) {
        console.error("Failed to load favorites:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFavorites();
  }, [user, userLocation]);

  // Remove favorite
  const handleRemove = async (stationId: string) => {
    if (!user?.id) return;

    try {
      await removeFavorite(user.id, stationId);
      setFavorites(favorites.filter((s) => s.id !== stationId));
    } catch (error) {
      console.error("Failed to remove favorite:", error);
      showToast("Failed to remove favorite. Please try again.", "error");
    }
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
        <div className="flex-1">
          <h1 className="text-white text-2xl font-bold">Favorites</h1>
          <p className="text-white/50 text-sm">{favorites.length} saved stations</p>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <RefreshCw className="w-8 h-8 text-[#00E0C6] animate-spin mb-3" />
          <p className="text-white/60 text-sm">Loading favorites...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && favorites.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Heart className="w-16 h-16 text-white/20 mb-4" />
          <p className="text-white/60 text-lg font-semibold mb-2">No favorites yet</p>
          <p className="text-white/40 text-sm max-w-xs">
            Tap the heart icon on any station to save it here for quick access
          </p>
        </div>
      )}

      {/* Favorites List */}
      <div className="space-y-3">
        {favorites.map((station) => (
          <div
            key={station.id}
            className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/10 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Station Name */}
                <h3 className="text-white font-semibold mb-1">{station.name}</h3>
                
                {/* Station Type Badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`
                    px-2 py-0.5 rounded-lg text-xs font-semibold
                    ${station.type === "ev"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                      : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                    }
                  `}>
                    {station.type === "ev" ? "EV Charging" : "Fuel"}
                  </span>
                </div>

                {/* Distance */}
                {station.distance_km != null && (
                  <p className="text-white/50 text-sm flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {station.distance_km.toFixed(1)} km away
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Navigate */}
                <button
                  onClick={() => onStationClick(station)}
                  className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] flex items-center justify-center hover:shadow-lg transition"
                  title="View details"
                >
                  <Navigation className="w-4 h-4 text-[#0D0F14]" />
                </button>

                {/* Remove */}
                <button
                  onClick={() => handleRemove(station.id)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center transition"
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4 text-white/60 hover:text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
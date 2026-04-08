// src/components/screens/StationDetailsScreen.tsx

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Database,
  Fuel,
  Zap,
  Navigation,
  Share2,
  Heart,
  AlertCircle,
  TrendingUp,
} from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import { useAuth } from "../../lib/authContext";
import { submitStationUpdate } from "../../api/stationUpdates";
import { supabase } from "../../lib/supabaseClient";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite } from "../../api/favorites";

import type { Station } from "../../App";

/* ---------------- Helpers ---------------- */

function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

const UPDATE_COOLDOWN_MINUTES = 15;

function minutesSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / 60000;
}

/* ---------------- Props ---------------- */

interface Props {
  station: Station;
  onBack: () => void;
  onSubmitUpdate: () => void;
}

/* ---------------- Component ---------------- */

export default function StationDetailsScreen({
  station,
  onBack,
  onSubmitUpdate,
}: Props) {
  const { user } = useAuth();

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateSource, setUpdateSource] = useState<
    "community" | "open-data" | null
  >(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* Load initial favourite state */
  useEffect(() => {
    if (!user?.id) return;
    checkIsFavorite(user.id, station.id).then(setIsFavorite);
  }, [user, station.id]);

  /* Load last update info */
  useEffect(() => {
    let cancelled = false;

    async function loadLastUpdate() {
      const { data } = await supabase
        .from("station_updates")
        .select("created_at")
        .eq("station_name", station.name)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!cancelled && data?.length) {
        setLastUpdated(data[0].created_at);
        setUpdateSource("community");
        return;
      }

      const apiDate =
        station.raw?.DateLastVerified ||
        station.raw?.DateLastStatusUpdate;

      if (!cancelled && apiDate) {
        setLastUpdated(apiDate);
        setUpdateSource("open-data");
      }
    }

    loadLastUpdate();
    return () => {
      cancelled = true;
    };
  }, [station]);

  /* Submit update with cooldown */
  const handleSubmitUpdate = async () => {
    if (!user) {
      alert("Please sign in to submit updates");
      return;
    }

    if (submitting) return;

    const { data: recent } = await supabase
      .from("station_updates")
      .select("created_at")
      .eq("user_id", user.id)
      .eq("station_name", station.name)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent?.length) {
      const mins = minutesSince(recent[0].created_at);
      if (mins < UPDATE_COOLDOWN_MINUTES) {
        alert(
          `Please wait ${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins)} more minute${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins) !== 1 ? 's' : ''} before submitting another update.`
        );
        return;
      }
    }

    const raw = window.prompt("Enter new price (€):");
    if (!raw) return;

    const newPrice = Number(raw);
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      alert("Please enter a valid price");
      return;
    }

    setSubmitting(true);
    try {
      await submitStationUpdate({
        userId: user.id,
        station,
        newPrice,
        note: null,
      });

      onSubmitUpdate();
    } catch (error) {
      console.error("Failed to submit update:", error);
      alert("Failed to submit update. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: station.name,
          text: `Check out this ${station.type === 'ev' ? 'EV charging' : 'fuel'} station on WaySave`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert("Please sign in to save favourites");
      return;
    }
    if (favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await removeFavorite(user.id, station.id);
        setIsFavorite(false);
      } else {
        await addFavorite(user.id, station);
        setIsFavorite(true);
      }
    } catch (error) {
      console.error("Failed to update favourite:", error);
      alert("Failed to update favourite. Please try again.");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;
  const isEV = station.type === "ev";

  /* ---------------- UI ---------------- */

  return (
    <div className="w-full h-full bg-[#0D0F14] overflow-y-auto pb-24">
      <div className="px-6 pt-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="
              flex items-center gap-2 
              text-white/70 hover:text-white 
              transition-colors
              -ml-2 px-2 py-1 rounded-lg
              hover:bg-white/5
            "
          >
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>

          <div className="flex gap-2">
            {/* Share Button */}
            <button
              onClick={handleShare}
              className="
                w-10 h-10 rounded-xl
                bg-white/5 border border-white/10
                flex items-center justify-center
                hover:bg-white/10 transition
              "
              aria-label="Share"
            >
              <Share2 size={18} className="text-white/70" />
            </button>

            {/* Favorite Button */}
            <button
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`
                w-10 h-10 rounded-xl
                border transition
                flex items-center justify-center
                disabled:opacity-50 disabled:cursor-not-allowed
                ${isFavorite 
                  ? 'bg-red-500/20 border-red-500/50' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                }
              `}
              aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart 
                size={18} 
                className={isFavorite ? 'text-red-500 fill-red-500' : 'text-white/70'} 
              />
            </button>
          </div>
        </div>

        {/* Station Header */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            {/* Station Type Icon */}
            <div className={`
              w-12 h-12 rounded-2xl 
              flex items-center justify-center
              ${isEV 
                ? 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30' 
                : 'bg-gradient-to-br from-orange-500/20 to-yellow-500/20 border border-orange-500/30'
              }
            `}>
              {isEV ? (
                <Zap className="text-blue-400" size={24} />
              ) : (
                <Fuel className="text-orange-400" size={24} />
              )}
            </div>

            {/* Station Name & Distance */}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">
                {station.name}
              </h1>
              {station.distance_km != null && (
                <p className="text-sm text-white/50 mt-1 flex items-center gap-1">
                  <MapPin size={14} />
                  {station.distance_km.toFixed(1)} km away
                </p>
              )}
            </div>
          </div>

          {/* Station Type Badge */}
          <div className="flex gap-2">
            <span className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${isEV 
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' 
                : 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
              }
            `}>
              {isEV ? 'EV Charging' : 'Fuel Station'}
            </span>
          </div>
        </div>

        {/* Price Card (Fuel only) */}
        {station.type === "fuel" && station.price_value != null && (
          <div className="
            bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 
            border border-[#00E0C6]/20
            rounded-2xl p-6
          ">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs text-white/50 uppercase tracking-wide mb-2">
                  Current Price
                </p>
                <p className="text-4xl font-bold text-[#00E0C6]">
                  €{station.price_value.toFixed(2)}
                </p>
                <p className="text-sm text-white/60 mt-1">per liter</p>
              </div>
              <div className="flex items-center gap-1 text-green-40 text-sm">
                <TrendingUp size={16} />
                <span>Community Reported</span>
              </div>
            </div>
          </div>
        )}

        {/* EV Info Card */}
        {isEV && (
          <div className="
            bg-gradient-to-br from-blue-500/10 to-cyan-500/10 
            border border-blue-500/20
            rounded-2xl p-6
          ">
            <div className="flex items-center gap-3 mb-3">
              <Zap className="text-blue-400" size={24} />
              <div>
                <p className="text-white font-semibold">EV Charging Available</p>
                <p className="text-sm text-white/50">Multiple connector types</p>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg border border-blue-500/30">
                Type 2
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg border border-blue-500/30">
                CCS
              </span>
              <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-lg border border-blue-500/30">
                CHAdeMO
              </span>
            </div>
          </div>
        )}

        {/* Last Updated Info */}
        {lastUpdated && (
          <div className="
            bg-white/5 border border-white/10 
            rounded-xl p-4
            flex items-center justify-between
          ">
            <div className="flex items-center gap-3">
              <Clock className="text-white/40" size={18} />
              <div>
                <p className="text-sm text-white">Last updated</p>
                <p className="text-xs text-white/50">{timeAgo(lastUpdated)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <Database size={14} className="text-white/40" />
              <span className="text-white/50">
                {updateSource === "community" ? "Community" : "Open Data"}
              </span>
            </div>
          </div>
        )}

        {/* Map Preview */}
        <div className="rounded-2xl overflow-hidden border border-white/10 h-48">
          <GoogleMapBackground
            userLocation={{ lat: station.lat, lng: station.lng }}
            markers={[station]}
            zoom={15}
            onPinSelect={() => {}}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Navigate Button */}
          <a
            href={navigateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="
              w-full py-4 rounded-2xl
              bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
              text-[#0D0F14] font-bold
              flex items-center justify-center gap-2
              shadow-[0_0_20px_rgba(0,224,198,0.35)]
              active:scale-95 transition
            "
          >
            <Navigation size={20} />
            Get Directions
          </a>

          {/* Submit Update Button (Fuel only) */}
          {station.type === "fuel" && (
            <button
              onClick={handleSubmitUpdate}
              disabled={submitting}
              className="
                w-full py-3 rounded-2xl
                bg-white/5 border border-white/10
                text-white font-semibold
                hover:bg-white/10
                active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed
                transition
                flex items-center justify-center gap-2
              "
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <TrendingUp size={18} />
                  Update Price
                </>
              )}
            </button>
          )}
        </div>

        {/* Info Notice */}
        <div className="
          bg-blue-500/10 border border-blue-500/20
          rounded-xl p-4
          flex gap-3
        ">
          <AlertCircle className="text-blue-400 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm text-white font-semibold mb-1">
              Community Verified
            </p>
            <p className="text-xs text-white/60 leading-relaxed">
              Station information is regularly updated by our community. 
              Help keep prices accurate by submitting updates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
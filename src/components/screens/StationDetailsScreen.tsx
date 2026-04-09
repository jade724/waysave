// src/components/screens/StationDetailsScreen.tsx

import { useEffect, useMemo, useState } from "react";
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
  Star,
  ExternalLink,
} from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import { useToast } from "../../lib/toastContext";
import { useAuth } from "../../lib/authContext";
import { submitStationUpdate } from "../../api/stationUpdates";
import { supabase } from "../../lib/supabaseClient";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite } from "../../api/favorites";

import type { Station } from "../../types/station";

function timeAgo(date: string): string {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days !== 1 ? "s" : ""} ago`;
}

const UPDATE_COOLDOWN_MINUTES = 15;

function minutesSince(date: string): number {
  return (Date.now() - new Date(date).getTime()) / 60000;
}

/** Pull human-readable connector labels from OpenChargeMap payload when present. */
function extractEvConnectorLabels(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const ocm = raw as {
    Connections?: Array<{
      ConnectionType?: { Title?: string; FormalName?: string };
    }>;
  };
  const out: string[] = [];
  const seen = new Set<string>();
  ocm.Connections?.forEach((c) => {
    const label = c.ConnectionType?.Title || c.ConnectionType?.FormalName;
    if (!label) return;
    const key = label.trim();
    if (key && !seen.has(key.toLowerCase())) {
      seen.add(key.toLowerCase());
      out.push(key);
    }
  });
  return out.slice(0, 12);
}

interface Props {
  station: Station;
  onBack: () => void;
  onSubmitUpdate: () => void;
}

export default function StationDetailsScreen({
  station,
  onBack,
  onSubmitUpdate,
}: Props) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updateSource, setUpdateSource] = useState<"community" | "open-data" | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [priceDraft, setPriceDraft] = useState("");

  const isEV = station.type === "ev";
  const connectorLabels = useMemo(() => extractEvConnectorLabels(station.raw), [station.raw]);

  useEffect(() => {
    if (station.price_value != null) {
      setPriceDraft(station.price_value.toFixed(3));
    } else {
      setPriceDraft("");
    }
  }, [station.id, station.price_value]);

  useEffect(() => {
    if (!user?.id) return;
    checkIsFavorite(user.id, station.id).then(setIsFavorite);
  }, [user, station.id]);

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

      const ocmRaw = station.raw as
        | { DateLastVerified?: string; DateLastStatusUpdate?: string }
        | undefined;
      const apiDate = ocmRaw?.DateLastVerified || ocmRaw?.DateLastStatusUpdate;

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

  const handleSubmitUpdate = async () => {
    if (!user) {
      showToast("Please sign in to submit updates", "error");
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
        showToast(
          `Please wait ${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins)} more minute${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins) !== 1 ? "s" : ""} before submitting another update.`,
          "error"
        );
        return;
      }
    }

    const newPrice = Number(priceDraft.replace(",", "."));
    if (!Number.isFinite(newPrice) || newPrice <= 0) {
      showToast("Enter a valid price per litre (e.g. 1.549)", "error");
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
      showToast("Failed to submit update. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: station.name,
          text: `Check out this ${station.type === "ev" ? "EV charging" : "fuel"} station on WaySave`,
          url: window.location.href,
        });
      } catch {
        /* dismissed */
      }
    } else {
      const url = `https://www.google.com/maps/search/?api=1&query=${station.lat},${station.lng}`;
      void navigator.clipboard.writeText(url);
      showToast("Link copied to clipboard", "success");
    }
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      showToast("Please sign in to save favourites", "error");
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
      showToast("Failed to update favourite. Please try again.", "error");
    } finally {
      setFavoriteLoading(false);
    }
  };

  const navigateUrl = `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  const accent = isEV
    ? {
        iconBg: "bg-emerald-500/12 border-emerald-500/25",
        icon: "text-emerald-400",
        badge: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25",
        hero: "from-emerald-500/12 via-[#0D0F14] to-[#0D0F14]",
      }
    : {
        iconBg: "bg-cyan-500/12 border-cyan-500/25",
        icon: "text-cyan-400",
        badge: "bg-amber-500/12 text-amber-200 border-amber-500/25",
        hero: "from-cyan-500/10 via-[#0D0F14] to-[#0D0F14]",
      };

  return (
    <div className="w-full min-h-full bg-[#0D0F14] pb-28">
      {/* Top bar */}
      <div className="sticky top-0 z-20 px-4 pt-3 pb-3 bg-[#0D0F14]/85 backdrop-blur-lg border-b border-white/[0.06]">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 -ml-1 pl-1 pr-3 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/50"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden />
            <span className="text-sm font-semibold">Back</span>
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="w-11 h-11 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center hover:bg-white/10 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40"
              aria-label="Share station"
            >
              <Share2 className="w-[18px] h-[18px] text-white/75" />
            </button>
            <button
              type="button"
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              className={`
                w-11 h-11 rounded-xl border transition flex items-center justify-center
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40
                ${isFavorite ? "bg-rose-500/15 border-rose-500/35" : "bg-white/[0.06] border-white/10 hover:bg-white/10"}
              `}
              aria-label={isFavorite ? "Remove from favourites" : "Add to favourites"}
            >
              <Heart
                className={`w-[18px] h-[18px] ${isFavorite ? "text-rose-400 fill-rose-400" : "text-white/70"}`}
              />
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 pt-2 pb-8 max-w-lg mx-auto space-y-5">
        {/* Hero */}
        <div
          className={`relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b ${accent.hero} p-5 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.8)]`}
        >
          <div className="flex gap-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border ${accent.iconBg}`}
            >
              {isEV ? (
                <Zap className={`w-7 h-7 ${accent.icon}`} strokeWidth={2.25} />
              ) : (
                <Fuel className={`w-7 h-7 ${accent.icon}`} strokeWidth={2.25} />
              )}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight tracking-tight">
                {station.name}
              </h1>
              {station.address && (
                <p className="text-sm text-white/45 mt-1.5 leading-snug">{station.address}</p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${accent.badge}`}
                >
                  {isEV ? "EV charging" : "Fuel station"}
                </span>
                {station.rating != null && (
                  <span className="inline-flex items-center gap-1 text-xs text-white/55">
                    <Star className="w-3.5 h-3.5 text-amber-400/90" aria-hidden />
                    {station.rating.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {station.distance_km != null && (
            <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
              <MapPin className="w-4 h-4 text-[#00E0C6]/70 shrink-0" aria-hidden />
              <span className="tabular-nums">{station.distance_km.toFixed(1)} km away</span>
            </div>
          )}
        </div>

        {/* Price — fuel */}
        {station.type === "fuel" && (
          <section className="rounded-3xl border border-[#00E0C6]/20 bg-[#12151c] overflow-hidden">
            <div className="px-5 py-5 border-b border-white/[0.06]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1">
                Price
              </p>
              {station.price_value != null ? (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-bold tabular-nums text-[#5eead4] leading-none">
                      €{station.price_value.toFixed(2)}
                    </p>
                    <p className="text-sm text-white/45 mt-2">per litre</p>
                  </div>
                  {station.priceSource === "community" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-300/95">
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden />
                      Community
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/50 leading-relaxed">
                  No community price yet. Be the first to add one below.
                </p>
              )}
            </div>

            <div className="px-5 py-4 bg-white/[0.02]">
              <label htmlFor="price-draft" className="text-xs font-medium text-white/50 block mb-2">
                Report price (€/L)
              </label>
              <div className="flex gap-2">
                <input
                  id="price-draft"
                  type="text"
                  inputMode="decimal"
                  placeholder="e.g. 1.549"
                  value={priceDraft}
                  onChange={(e) => setPriceDraft(e.target.value)}
                  className="flex-1 min-w-0 rounded-xl border border-white/10 bg-[#0D0F14] px-4 py-3 text-white text-base placeholder:text-white/25 focus:outline-none focus:ring-2 focus:ring-[#00E0C6]/40"
                />
                <button
                  type="button"
                  onClick={handleSubmitUpdate}
                  disabled={submitting || !user}
                  title={!user ? "Sign in to submit a price" : undefined}
                  className="shrink-0 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] px-5 py-3 text-[#0D0F14] text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  {submitting ? "…" : "Submit"}
                </button>
              </div>
              <p className="text-[11px] text-white/35 mt-2">
                {!user
                  ? "Sign in to submit · "
                  : `One update per ${UPDATE_COOLDOWN_MINUTES} min · `}
                estimates only — check pump price before filling
              </p>
            </div>
          </section>
        )}

        {/* EV */}
        {isEV && (
          <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-[#12151c] p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-white font-semibold">Charging</h2>
                <p className="text-sm text-white/45 mt-0.5">Connectors at this location</p>
              </div>
            </div>
            {connectorLabels.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {connectorLabels.map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-medium text-emerald-200/95"
                  >
                    {label}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-white/45">
                Connector details will match your filter settings when listed on the map.
              </p>
            )}
          </section>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="w-[18px] h-[18px] text-white/35 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">Last updated</p>
                <p className="text-xs text-white/45">{timeAgo(lastUpdated)}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/45 shrink-0">
              <Database className="w-3.5 h-3.5" />
              {updateSource === "community" ? "Community" : "Open data"}
            </div>
          </div>
        )}

        {/* Map */}
        <section>
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 px-0.5">
            Location
          </h2>
          <div className="rounded-2xl overflow-hidden border border-white/[0.08] h-52 shadow-inner">
            <GoogleMapBackground
              userLocation={{ lat: station.lat, lng: station.lng }}
              markers={[station]}
              zoom={15}
              onPinSelect={() => {}}
              selectedStation={station}
            />
          </div>
        </section>

        {/* Navigate */}
        <a
          href={navigateUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] py-4 text-[#0D0F14] font-bold text-[15px] shadow-[0_8px_32px_-8px_rgba(0,224,198,0.45)] active:scale-[0.99] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <Navigation className="w-5 h-5" aria-hidden />
          Open in Google Maps
          <ExternalLink className="w-4 h-4 opacity-80" aria-hidden />
        </a>

        {/* Notice */}
        <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-4 flex gap-3">
          <AlertCircle className="text-sky-400 shrink-0 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white/90">
              {isEV ? "Before you go" : "Community prices"}
            </p>
            <p className="text-xs text-white/50 leading-relaxed mt-1">
              {isEV
                ? "Availability and connectors can change. Confirm on site or with the operator app."
                : "Fuel prices are crowd-sourced. Always check the pump before you fill up."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

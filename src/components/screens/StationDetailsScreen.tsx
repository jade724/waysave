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
  Camera,
} from "lucide-react";

import GoogleMapBackground from "../map/GoogleMapBackground";
import { useToast } from "../../lib/toastContext";
import { useAuth } from "../../lib/authContext";
import { submitPriceReport } from "../../api/priceReports";
import {
  type FuelGrade,
  formatIrelandPumpCentsPerL,
  parseFuelPriceUserInput,
} from "../../lib/fuelPrices";
import { supabase } from "../../lib/supabaseClient";
import { addFavorite, removeFavorite, isFavorite as checkIsFavorite } from "../../api/favorites";

import type { Station } from "../../types/station";
import { describeStationUpdateError } from "../../lib/supabaseErrors";
import { formatTimeAgo, maxIsoTimestamps } from "../../lib/formatTimeAgo";
import { extractOcmChargingDetails } from "../../lib/ocmChargingInfo";

const UPDATE_COOLDOWN_MINUTES = 15;

/** Matches `BottomNav`: fixed `bottom-6` + `h-[78px]` + home indicator / thumb space. */
const BOTTOM_NAV_RESERVE =
  "pb-[calc(78px+1.5rem+env(safe-area-inset-bottom,0px)+1rem)]";

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
  /** Latest `price_reports.created_at` per grade (from DB — accurate even if list `station` is stale). */
  const [gradeReportedAt, setGradeReportedAt] = useState<{
    petrol?: string;
    diesel?: string;
  }>({});
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [submittingGrade, setSubmittingGrade] = useState<FuelGrade | null>(null);
  const [priceDraftPetrol, setPriceDraftPetrol] = useState("");
  const [priceDraftDiesel, setPriceDraftDiesel] = useState("");
  const [photoPetrol, setPhotoPetrol] = useState<File | null>(null);
  const [photoDiesel, setPhotoDiesel] = useState<File | null>(null);
  const [photoPreviewPetrol, setPhotoPreviewPetrol] = useState<string | null>(null);
  const [photoPreviewDiesel, setPhotoPreviewDiesel] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPetrol) {
      setPhotoPreviewPetrol(null);
      return;
    }
    const url = URL.createObjectURL(photoPetrol);
    setPhotoPreviewPetrol(url);
    return () => URL.revokeObjectURL(url);
  }, [photoPetrol]);

  useEffect(() => {
    if (!photoDiesel) {
      setPhotoPreviewDiesel(null);
      return;
    }
    const url = URL.createObjectURL(photoDiesel);
    setPhotoPreviewDiesel(url);
    return () => URL.revokeObjectURL(url);
  }, [photoDiesel]);

  const isEV = station.type === "ev";
  const connectorLabels = useMemo(() => extractEvConnectorLabels(station.raw), [station.raw]);
  const ocmDetails = useMemo(
    () => (isEV ? extractOcmChargingDetails(station.raw) : null),
    [isEV, station.raw]
  );

  const showBothFuelsNote =
    station.type === "fuel" &&
    (station.fuelTypes === "both" ||
      (station.fuelPrices?.petrol != null && station.fuelPrices?.diesel != null));

  /** Prefer fresh DB fetch (`gradeReportedAt`); fall back to list enrichment. */
  const petrolReportedIso = gradeReportedAt.petrol ?? station.fuelPricesReportedAt?.petrol;
  const dieselReportedIso = gradeReportedAt.diesel ?? station.fuelPricesReportedAt?.diesel;

  useEffect(() => {
    const fp = station.fuelPrices;
    const noSplit =
      fp == null ||
      (fp.petrol == null && fp.diesel == null);

    // Per-grade drafts: only fall back to legacy `price_value` when we have no split community prices.
    // Otherwise `price_value` is often min(petrol, diesel) and would wrongly pre-fill the other grade.
    // Prefill in pump c/L (same style as cards and forecourt signs), not €/L.
    if (fp?.petrol != null) setPriceDraftPetrol(formatIrelandPumpCentsPerL(fp.petrol));
    else if (noSplit && station.price_value != null)
      setPriceDraftPetrol(formatIrelandPumpCentsPerL(station.price_value));
    else setPriceDraftPetrol("");

    if (fp?.diesel != null) setPriceDraftDiesel(formatIrelandPumpCentsPerL(fp.diesel));
    else if (noSplit && station.price_value != null)
      setPriceDraftDiesel(formatIrelandPumpCentsPerL(station.price_value));
    else setPriceDraftDiesel("");
  }, [station.id, station.price_value, station.fuelPrices]);

  useEffect(() => {
    if (!user?.id) return;
    checkIsFavorite(user.id, station.id).then(setIsFavorite);
  }, [user, station.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadLastUpdate() {
      setGradeReportedAt({});
      setLastUpdated(null);
      setUpdateSource(null);

      if (station.type === "fuel") {
        const { data } = await supabase
          .from("price_reports")
          .select("fuel_grade, created_at")
          .eq("station_name", station.name)
          .eq("station_type", "fuel")
          .order("created_at", { ascending: false });

        if (cancelled) return;

        let petrolAt: string | undefined;
        let dieselAt: string | undefined;
        for (const row of data ?? []) {
          const g = row.fuel_grade as string | null;
          if (g === "petrol" && !petrolAt) petrolAt = row.created_at;
          else if (g === "diesel" && !dieselAt) dieselAt = row.created_at;
          if (petrolAt && dieselAt) break;
        }

        setGradeReportedAt({ petrol: petrolAt, diesel: dieselAt });

        const latestCommunity = maxIsoTimestamps(
          [petrolAt, dieselAt].filter((x): x is string => typeof x === "string")
        );
        if (latestCommunity) {
          setLastUpdated(latestCommunity);
          setUpdateSource("community");
          return;
        }
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

  const handleSubmitGrade = async (grade: FuelGrade) => {
    if (!user) {
      showToast("Please sign in to submit updates", "error");
      return;
    }

    if (submittingGrade) return;

    const draft = grade === "petrol" ? priceDraftPetrol : priceDraftDiesel;

    const { data: recent } = await supabase
      .from("price_reports")
      .select("created_at")
      .eq("reporter_id", user.id)
      .eq("station_name", station.name)
      .eq("fuel_grade", grade)
      .order("created_at", { ascending: false })
      .limit(1);

    if (recent?.length) {
      const mins = minutesSince(recent[0].created_at);
      if (mins < UPDATE_COOLDOWN_MINUTES) {
        showToast(
          `Please wait ${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins)} more minute${Math.ceil(UPDATE_COOLDOWN_MINUTES - mins) !== 1 ? "s" : ""} before another ${grade} update here.`,
          "error"
        );
        return;
      }
    }

    const parsed = parseFuelPriceUserInput(draft);
    if (!parsed.ok) {
      showToast(parsed.message, "error");
      return;
    }

    setSubmittingGrade(grade);
    try {
      await submitPriceReport({
        userId: user.id,
        station,
        fuelGrade: grade,
        price: parsed.eurPerL,
        photoFile: grade === "petrol" ? photoPetrol : photoDiesel,
      });

      if (grade === "petrol") setPhotoPetrol(null);
      else setPhotoDiesel(null);

      onSubmitUpdate();
    } catch (error) {
      console.error("Failed to submit update:", error);
      showToast(describeStationUpdateError(error), "error");
    } finally {
      setSubmittingGrade(null);
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
    <div
      className={`flex flex-1 flex-col min-h-0 w-full overflow-y-auto overscroll-y-contain bg-[#0D0F14] ${BOTTOM_NAV_RESERVE}`}
    >
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

      <div className="px-5 pt-2 pb-4 max-w-lg mx-auto space-y-5">
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
                {!isEV && station.isOpen === true && (
                  <span className="text-[11px] font-medium text-emerald-400/95 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
                    Likely open now
                  </span>
                )}
                {!isEV && station.isOpen === false && (
                  <span className="text-[11px] font-medium text-white/40 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5">
                    May be closed now
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

        {/* Price — fuel (petrol & diesel tracked separately) */}
        {station.type === "fuel" && (
          <section className="rounded-3xl border border-[#00E0C6]/20 bg-[#12151c] overflow-hidden">
            <div className="px-5 py-5 border-b border-white/[0.06]">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-3">
                {station.typicalRetailFill ? "Typical retail range" : "Community prices"}
              </p>
              {showBothFuelsNote && (
                <p className="text-xs text-white/50 leading-relaxed mb-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2">
                  Most forecourts sell <span className="text-white/75">both</span> petrol and diesel,
                  but the price per litre is almost always{" "}
                  <span className="text-white/75">different for each</span>. Report and compare them
                  separately below.
                </p>
              )}
              {station.fuelPrices?.petrol != null || station.fuelPrices?.diesel != null ? (
                <div className="flex flex-wrap gap-6 items-end justify-between">
                  <div className="flex flex-wrap gap-8">
                    {station.fuelPrices?.petrol != null && (
                      <div>
                        <p className="text-xs text-white/45 mb-1">Petrol</p>
                        <p className="text-3xl font-bold tabular-nums text-[#5eead4] leading-none">
                          {formatIrelandPumpCentsPerL(station.fuelPrices.petrol)}
                          <span className="text-sm text-white/40 font-medium">c/L</span>
                        </p>
                        <p className="text-xs text-white/40 mt-1 tabular-nums">
                          €{station.fuelPrices.petrol.toFixed(3)}/L
                        </p>
                        {petrolReportedIso && (
                          <p className="text-[10px] text-white/35 mt-1.5">
                            Reported {formatTimeAgo(petrolReportedIso)}
                          </p>
                        )}
                      </div>
                    )}
                    {station.fuelPrices?.diesel != null && (
                      <div>
                        <p className="text-xs text-white/45 mb-1">Diesel</p>
                        <p className="text-3xl font-bold tabular-nums text-[#5eead4] leading-none">
                          {formatIrelandPumpCentsPerL(station.fuelPrices.diesel)}
                          <span className="text-sm text-white/40 font-medium">c/L</span>
                        </p>
                        <p className="text-xs text-white/40 mt-1 tabular-nums">
                          €{station.fuelPrices.diesel.toFixed(3)}/L
                        </p>
                        {dieselReportedIso && (
                          <p className="text-[10px] text-white/35 mt-1.5">
                            Reported {formatTimeAgo(dieselReportedIso)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {station.priceSource === "community" && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/12 border border-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-300/95 shrink-0">
                      <TrendingUp className="w-3.5 h-3.5" aria-hidden />
                      Community
                    </span>
                  )}
                  {station.typicalRetailFill && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1 text-xs font-semibold text-white/50 shrink-0">
                      Typical range
                    </span>
                  )}
                </div>
              ) : station.price_value != null ? (
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-bold tabular-nums text-[#5eead4] leading-none">
                      {formatIrelandPumpCentsPerL(station.price_value)}
                      <span className="text-base text-white/40 font-medium">c/L</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1 tabular-nums">
                      €{station.price_value.toFixed(3)}/L
                    </p>
                    <p className="text-sm text-white/45 mt-2">per litre (unspecified grade)</p>
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
                  No community price yet. Add petrol and diesel below — they are usually different.
                </p>
              )}
              {station.priceSource === "community" &&
                !station.typicalRetailFill &&
                station.fuelPrices?.petrol != null &&
                station.fuelPrices?.diesel != null && (
                  <p className="text-[11px] text-white/40 mt-3">
                    Each time is when that fuel was last reported — updating one does not reset the
                    other.
                  </p>
                )}
              {station.typicalRetailFill ? (
                <p className="text-[11px] text-white/45 mt-3 leading-relaxed">
                  Figures shown are a typical Irish retail range for this week — not from this
                  forecourt. Add a report below so everyone sees real pump prices here.
                </p>
              ) : (
                <p className="text-[11px] text-amber-200/70 mt-3 leading-relaxed">
                  Community prices are <span className="font-medium text-amber-200/90">estimates</span> —
                  always take the price from the pump display before you fill up.
                </p>
              )}
            </div>

            <div className="px-5 py-4 bg-white/[0.02] space-y-4">
              <p className="text-[11px] text-white/40 leading-relaxed flex gap-2">
                <Camera className="w-3.5 h-3.5 shrink-0 mt-0.5 text-white/35" aria-hidden />
                Optional photo of the pump or price display helps keep data trustworthy. Avoid people and
                readable number plates if you can.
              </p>
              <div>
                <label htmlFor="price-draft-petrol" className="text-xs font-medium text-white/50 block mb-2">
                  Report petrol — <span className="text-white/65">c/L</span> as on the pump (e.g. 203.9). Optional:
                  €/L (e.g. 2.039).
                </label>
                <div className="flex gap-2">
                  <div className="flex flex-1 min-w-0 rounded-xl border border-white/10 bg-[#0D0F14] focus-within:ring-2 focus-within:ring-[#00E0C6]/40 overflow-hidden">
                    <input
                      id="price-draft-petrol"
                      type="text"
                      inputMode="decimal"
                      placeholder="203.9"
                      autoComplete="off"
                      value={priceDraftPetrol}
                      onChange={(e) => setPriceDraftPetrol(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent px-4 py-3 text-white text-base tabular-nums placeholder:text-white/25 focus:outline-none"
                      aria-describedby="price-draft-petrol-hint"
                    />
                    <span
                      id="price-draft-petrol-suffix"
                      className="shrink-0 self-center pr-4 text-sm font-medium tabular-nums text-white/40"
                    >
                      c/L
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSubmitGrade("petrol")}
                    disabled={submittingGrade !== null || !user}
                    title={!user ? "Sign in to submit a price" : undefined}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] px-4 py-3 text-[#0D0F14] text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    {submittingGrade === "petrol" ? "…" : "Submit"}
                  </button>
                </div>
                <p id="price-draft-petrol-hint" className="mt-1.5 text-[10px] text-white/30 leading-relaxed">
                  Matches the big digits on the price board. You can still enter euros per litre if you prefer.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    id="photo-petrol"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setPhotoPetrol(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="photo-petrol"
                    className="text-xs font-medium text-[#00E0C6]/90 cursor-pointer hover:underline"
                  >
                    + Add photo (optional)
                  </label>
                  {photoPetrol && (
                    <button
                      type="button"
                      className="text-xs text-white/40 hover:text-white/60"
                      onClick={() => setPhotoPetrol(null)}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                {photoPreviewPetrol && (
                  <img
                    src={photoPreviewPetrol}
                    alt=""
                    className="mt-2 max-h-28 rounded-lg border border-white/10 object-contain"
                  />
                )}
              </div>
              <div>
                <label htmlFor="price-draft-diesel" className="text-xs font-medium text-white/50 block mb-2">
                  Report diesel — <span className="text-white/65">c/L</span> as on the pump (e.g. 208.9). Optional:
                  €/L (e.g. 2.089).
                </label>
                <div className="flex gap-2">
                  <div className="flex flex-1 min-w-0 rounded-xl border border-white/10 bg-[#0D0F14] focus-within:ring-2 focus-within:ring-[#00E0C6]/40 overflow-hidden">
                    <input
                      id="price-draft-diesel"
                      type="text"
                      inputMode="decimal"
                      placeholder="208.9"
                      autoComplete="off"
                      value={priceDraftDiesel}
                      onChange={(e) => setPriceDraftDiesel(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent px-4 py-3 text-white text-base tabular-nums placeholder:text-white/25 focus:outline-none"
                      aria-describedby="price-draft-diesel-hint"
                    />
                    <span className="shrink-0 self-center pr-4 text-sm font-medium tabular-nums text-white/40">
                      c/L
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSubmitGrade("diesel")}
                    disabled={submittingGrade !== null || !user}
                    title={!user ? "Sign in to submit a price" : undefined}
                    className="shrink-0 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] px-4 py-3 text-[#0D0F14] text-sm font-bold disabled:opacity-45 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    {submittingGrade === "diesel" ? "…" : "Submit"}
                  </button>
                </div>
                <p id="price-draft-diesel-hint" className="mt-1.5 text-[10px] text-white/30 leading-relaxed">
                  Same format as above the list and on the totem — type what you see.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    id="photo-diesel"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => setPhotoDiesel(e.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="photo-diesel"
                    className="text-xs font-medium text-[#00E0C6]/90 cursor-pointer hover:underline"
                  >
                    + Add photo (optional)
                  </label>
                  {photoDiesel && (
                    <button
                      type="button"
                      className="text-xs text-white/40 hover:text-white/60"
                      onClick={() => setPhotoDiesel(null)}
                    >
                      Remove photo
                    </button>
                  )}
                </div>
                {photoPreviewDiesel && (
                  <img
                    src={photoPreviewDiesel}
                    alt=""
                    className="mt-2 max-h-28 rounded-lg border border-white/10 object-contain"
                  />
                )}
              </div>
              <p className="text-[11px] text-white/35">
                {!user
                  ? "Sign in to submit · "
                  : `Each grade: one update per ${UPDATE_COOLDOWN_MINUTES} min · `}
                Inputs use <span className="text-white/45">c/L</span> like the station display; €/L still works.
                Estimates only — always check the pump.
              </p>
            </div>
          </section>
        )}

        {/* EV — power, AC/DC, pricing hints, access (from Open Charge Map) */}
        {isEV && ocmDetails && (
          <section className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.07] to-[#12151c] p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/25">
                <Zap className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="min-w-0">
                <h2 className="text-white font-semibold">Charging</h2>
                <p className="text-sm text-white/45 mt-0.5">
                  From Open Charge Map — operators may charge session fees or idle time; confirm before you plug in.
                </p>
              </div>
            </div>

            {(ocmDetails.maxPowerKw != null || ocmDetails.hasAC || ocmDetails.hasDC) && (
              <div className="flex flex-wrap gap-2 items-center text-sm">
                {ocmDetails.maxPowerKw != null && (
                  <span className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 font-semibold tabular-nums text-emerald-200">
                    Up to {ocmDetails.maxPowerKw} kW
                  </span>
                )}
                {ocmDetails.hasAC && (
                  <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/70">
                    AC
                  </span>
                )}
                {ocmDetails.hasDC && (
                  <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-white/70">
                    DC
                  </span>
                )}
              </div>
            )}

            {ocmDetails.usageCost && (
              <p className="text-sm text-emerald-200/90">
                <span className="text-white/45">Pricing note: </span>
                {ocmDetails.usageCost}
              </p>
            )}

            {ocmDetails.operatorWebsiteUrl && (
              <a
                href={ocmDetails.operatorWebsiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-[#00E0C6] hover:text-[#5eead4]"
              >
                <ExternalLink className="w-4 h-4 shrink-0" aria-hidden />
                Operator / network website
              </a>
            )}

            {ocmDetails.connections.length > 0 ? (
              <ul className="space-y-2">
                {ocmDetails.connections.map((c, i) => (
                  <li
                    key={`${c.connectorTitle}-${i}`}
                    className="rounded-xl border border-white/[0.07] bg-[#0D0F14]/60 px-3 py-2.5 text-xs"
                  >
                    <p className="font-medium text-white/90">{c.connectorTitle}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-white/45">
                      {c.powerKw != null && <span>{c.powerKw} kW</span>}
                      {c.currentLabel && <span>{c.currentLabel}</span>}
                      {c.statusTitle && <span>{c.statusTitle}</span>}
                      {c.usageTypeTitle && <span>{c.usageTypeTitle}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : connectorLabels.length > 0 ? (
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
                Limited connector detail for this listing. Check the operator app or on-site signage.
              </p>
            )}

            {ocmDetails.accessComments && (
              <p className="text-xs text-white/50 leading-relaxed border-t border-white/[0.06] pt-3">
                <span className="text-white/65 font-medium">Access: </span>
                {ocmDetails.accessComments}
              </p>
            )}

            {ocmDetails.generalComments && (
              <p className="text-xs text-white/45 leading-relaxed">{ocmDetails.generalComments}</p>
            )}

            {ocmDetails.lastStatusUpdate && (
              <p className="text-[11px] text-white/35">
                Listing last status change: {formatTimeAgo(ocmDetails.lastStatusUpdate)} —{" "}
                <span className="text-amber-200/80">
                  availability may have changed; treat as a guide only.
                </span>
              </p>
            )}

            <p className="text-[11px] text-white/35 leading-relaxed border-t border-white/[0.06] pt-3">
              Physical access (e.g. cable reach, bay size) varies by site — check on arrival if you need
              specific accessibility.
            </p>
          </section>
        )}

        {/* Last updated */}
        {lastUpdated && (
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Clock className="w-[18px] h-[18px] text-white/35 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white/90">Last updated</p>
                <p className="text-xs text-white/45">{formatTimeAgo(lastUpdated)}</p>
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
              {isEV ? "Before you go" : station.typicalRetailFill ? "Typical retail range" : "Community prices"}
            </p>
            <p className="text-xs text-white/50 leading-relaxed mt-1">
              {isEV
                ? "Power, pricing, and socket availability can change. Use the operator app or on-site info before you travel."
                : station.typicalRetailFill
                  ? "Until someone reports from this station, we show a typical national range. Always use the pump display when you fill up."
                  : "Fuel prices are crowd-sourced. Always check the pump before you fill up."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

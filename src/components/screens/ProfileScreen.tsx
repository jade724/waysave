// src/components/screens/ProfileScreen.tsx

import {
  LogOut,
  Settings,
  Star,
  Map,
  Home,
  Pencil,
  Check,
  X,
  Sparkles,
  SlidersHorizontal,
  Copy,
  Navigation,
} from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useState, useEffect, useMemo } from "react";
import { getFavoritesCount } from "../../api/favorites";
import { supabase } from "../../lib/supabaseClient";
import { devError } from "../../lib/logger";
import { useToast } from "../../lib/toastContext";
import type { UserPreferences } from "../../lib/preferences";

interface Props {
  prefs: UserPreferences;
  onLoggedOut: () => void;
  onOpenFavorites: () => void;
  onOpenSettings: () => void;
  onOpenFilters: () => void;
  onOpenMap: () => void;
  onOpenHome: () => void;
}

function prefsSummary(p: UserPreferences): string {
  const tab = p.activeTab === "fuel" ? "Fuel" : "EV";
  const dist =
    p.maxDistanceKm > 0
      ? `${p.maxDistanceKm < 10 ? p.maxDistanceKm.toFixed(1) : Math.round(p.maxDistanceKm)} km`
      : "Any distance";
  const sort =
    p.preference === "nearest"
      ? "Nearest"
      : p.preference === "cheapest"
        ? "Best value"
        : "Fastest";
  return `${tab} · ${dist} · ${sort}`;
}

function memberSinceLabel(iso: string | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("en-IE", {
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

export default function ProfileScreen({
  prefs,
  onLoggedOut,
  onOpenFavorites,
  onOpenSettings,
  onOpenFilters,
  onOpenMap,
  onOpenHome,
}: Props) {
  const { user, signOut, refreshSession } = useAuth();
  const { showToast } = useToast();

  const [favoriteCount, setFavoriteCount] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const name =
    (user?.user_metadata?.full_name as string | undefined)?.trim() || "User";
  const email = user?.email ?? "—";

  const initials = useMemo(() => {
    if (name === "User" && email !== "—") {
      return email.slice(0, 2).toUpperCase();
    }
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [name, email]);

  const memberSince = memberSinceLabel(user?.created_at);

  const summary = useMemo(() => prefsSummary(prefs), [prefs]);

  useEffect(() => {
    const loadStats = async () => {
      if (!user?.id) return;
      setStatsLoading(true);
      try {
        const count = await getFavoritesCount(user.id);
        setFavoriteCount(count);
      } catch (error) {
        devError("Failed to load stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user]);

  const handleCopyEmail = async () => {
    if (email === "—" || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(email);
      showToast("Email copied", "success");
    } catch {
      showToast("Could not copy email", "error");
    }
  };

  const handleStartEdit = () => {
    setNameInput(name === "User" ? "" : name);
    setNameError(null);
    setEditingName(true);
  };

  const handleCancelEdit = () => {
    setEditingName(false);
    setNameError(null);
  };

  const handleSaveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setNameError("Name cannot be empty.");
      return;
    }
    if (!user) return;
    setNameSaving(true);
    setNameError(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: trimmed },
      });
      if (error) throw error;

      await supabase.from("profiles").update({ full_name: trimmed }).eq("id", user.id);

      await refreshSession();
      setEditingName(false);
      showToast("Name updated", "success");
    } catch (err: unknown) {
      setNameError(err instanceof Error ? err.message : "Failed to save name.");
    } finally {
      setNameSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      onLoggedOut();
    }
  };

  return (
    <div className="relative w-full h-full bg-[#0D0F14] overflow-y-auto text-white pb-28">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-24 -right-8 h-64 w-64 rounded-full bg-[#00E0C6]/11 blur-3xl" />
        <div className="absolute top-1/2 -left-20 h-52 w-52 rounded-full bg-[#0097FF]/10 blur-3xl" />
      </div>

      <div className="relative px-5 pt-5 pb-8 max-w-lg mx-auto">
        <header className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#00E0C6]/90 mb-1">
            Account
          </p>
          <h1 className="text-[1.6rem] font-bold tracking-tight">Profile</h1>
          <p className="text-white/45 text-sm mt-1.5 leading-relaxed">
            Manage your details and jump back into the app.
          </p>
        </header>

        {/* Identity */}
        <section className="mb-5 rounded-[1.35rem] border border-white/[0.09] bg-gradient-to-br from-[#00E0C6]/[0.14] via-[#12151c] to-[#0097FF]/[0.08] p-[1px] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.65)]">
          <div className="rounded-[1.3rem] bg-[#0D0F14]/80 backdrop-blur-sm p-5">
            <div className="flex gap-4">
              <div
                className="
                w-[4.75rem] h-[4.75rem] rounded-2xl shrink-0
                bg-gradient-to-br from-[#00E0C6] to-[#0097FF]
                flex items-center justify-center
                text-[#0D0F14] font-bold text-xl
                shadow-[0_0_32px_rgba(0,224,198,0.35)]
              "
              >
                {initials}
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="space-y-2">
                    <label className="sr-only" htmlFor="profile-display-name">
                      Display name
                    </label>
                    <input
                      id="profile-display-name"
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void handleSaveName();
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      placeholder="Your name"
                      autoFocus
                      className="
                      w-full bg-white/[0.06] border border-white/15 rounded-xl
                      px-3 py-2.5 text-white text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#00E0C6]/40 focus:border-[#00E0C6]/50
                      placeholder-white/35
                    "
                    />
                    {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveName()}
                        disabled={nameSaving}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14] text-xs font-bold hover:brightness-105 transition disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {nameSaving ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 text-xs font-semibold hover:bg-white/10 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-white font-bold text-lg leading-tight truncate">
                          {name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 min-w-0">
                          <p className="text-white/55 text-sm truncate">{email}</p>
                          {email !== "—" && (
                            <button
                              type="button"
                              onClick={() => void handleCopyEmail()}
                              className="shrink-0 p-1 rounded-lg text-white/40 hover:text-[#00E0C6] hover:bg-white/5 transition"
                              aria-label="Copy email address"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleStartEdit}
                        className="shrink-0 p-2 rounded-xl bg-white/[0.06] border border-white/10 hover:bg-white/10 transition"
                        aria-label="Edit display name"
                      >
                        <Pencil className="w-4 h-4 text-[#00E0C6]" />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-[11px] font-medium text-white/75">
                        <Sparkles className="w-3 h-3 text-[#00E0C6]" />
                        Member
                      </span>
                      {memberSince && (
                        <span className="text-[11px] text-white/40">Since {memberSince}</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Saved search defaults — mirrors Filters */}
        <section
          className="mb-5 rounded-2xl border border-white/[0.07] bg-[#12151c]/90 px-4 py-3.5"
          aria-label="Your current search defaults"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-1.5">
            Map defaults
          </p>
          <p className="text-sm text-white/80 leading-snug">{summary}</p>
          <button
            type="button"
            onClick={onOpenFilters}
            className="mt-3 text-xs font-semibold text-[#00E0C6] hover:text-[#00f0d4] transition"
          >
            Change in Filters →
          </button>
        </section>

        {/* Primary action */}
        <section className="mb-5">
          <button
            type="button"
            onClick={onOpenMap}
            className="group relative w-full overflow-hidden rounded-2xl text-left transition active:scale-[0.99]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#00E0C6] via-[#00c4e8] to-[#0097FF] opacity-100 transition group-hover:opacity-95" />
            <div className="relative flex items-center gap-4 px-5 py-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#0D0F14]/20 border border-[#0D0F14]/10">
                <Navigation className="h-6 w-6 text-[#0D0F14]" strokeWidth={2.25} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[#0D0F14] font-bold text-base">Open map</p>
                <p className="text-[#0D0F14]/75 text-sm font-medium">
                  Stations, routes & traffic
                </p>
              </div>
              <Map className="h-6 w-6 text-[#0D0F14]/60 shrink-0" aria-hidden />
            </div>
          </button>
        </section>

        {/* Shortcuts grid — single compact block */}
        <section aria-labelledby="profile-shortcuts-heading">
          <h2
            id="profile-shortcuts-heading"
            className="text-[13px] font-semibold text-white/50 uppercase tracking-wider mb-3"
          >
            Shortcuts
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenHome}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40"
            >
              <Home className="w-5 h-5 text-white/85 mb-2" />
              <p className="text-white font-semibold text-sm">Home</p>
              <p className="text-[11px] text-white/40 mt-0.5">Overview</p>
            </button>

            <button
              type="button"
              onClick={onOpenFilters}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40"
            >
              <SlidersHorizontal className="w-5 h-5 text-[#00E0C6] mb-2" />
              <p className="text-white font-semibold text-sm">Filters</p>
              <p className="text-[11px] text-white/40 mt-0.5">Distance & plugs</p>
            </button>

            <button
              type="button"
              onClick={onOpenFavorites}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <Star className="w-5 h-5 text-amber-300/95" />
                {!statsLoading && (
                  <span className="text-[11px] font-bold tabular-nums text-amber-200/90 bg-amber-500/15 px-2 py-0.5 rounded-lg border border-amber-500/25">
                    {favoriteCount}
                  </span>
                )}
              </div>
              <p className="text-white font-semibold text-sm">Favourites</p>
              <p className="text-[11px] text-white/40 mt-0.5">Saved stations</p>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E0C6]/40"
            >
              <Settings className="w-5 h-5 text-white/75 mb-2" />
              <p className="text-white font-semibold text-sm">Settings</p>
              <p className="text-[11px] text-white/40 mt-0.5">App preferences</p>
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
          <p className="text-xs text-white/50 leading-relaxed">
            <span className="text-white/70 font-medium">WaySave</span> v1.0.0 · Preferences are
            stored on this device. Trip insights may arrive in a future update.
          </p>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 w-full py-3.5 rounded-2xl border border-red-500/30 bg-red-500/[0.12]
          text-red-100 font-semibold hover:bg-red-500/20 transition flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>
    </div>
  );
}

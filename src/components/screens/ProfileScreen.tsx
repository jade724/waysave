// src/components/screens/ProfileScreen.tsx

import { LogOut, User, Settings, BarChart3, Star, MapPin, Fuel, Zap, Pencil, Check, X } from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { useState, useEffect } from "react";
import { getFavoritesCount } from "../../api/favorites";
import { supabase } from "../../lib/supabaseClient";

interface Props {
  onLoggedOut: () => void;
  onOpenFavorites: () => void;
  onOpenSettings: () => void;
}

interface UserStats {
  favoriteStations: number;
}

export default function ProfileScreen({ onLoggedOut, onOpenFavorites, onOpenSettings }: Props) {
  const { user, signOut } = useAuth();

  const [stats, setStats] = useState<UserStats>({ favoriteStations: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // Edit profile state
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const name = (user?.user_metadata?.full_name as string | undefined) ?? "User";
  const email = user?.email ?? "—";
 
  
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  
  useEffect(() => {
    
    const loadStats = async () => {
      if (!user?.id) return;
      setStatsLoading(true);
      try {
        const count = await getFavoritesCount(user.id);
        setStats((prev) => ({ ...prev, favoriteStations: count }));
        
      } catch (error) {
        console.error("Failed to load stats:", error);
      }
      finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [user]);

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

      // Also update the profiles table
      await supabase
        .from("profiles")
        .update({ full_name: trimmed })
        .eq("id", user.id);

      setEditingName(false);
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
    <div className="w-full h-full bg-[#0D0F14] px-6 pt-7 pb-24 overflow-y-auto text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <button
          onClick={handleLogout}
          className="p-2 rouded-xl bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition"
          aria-label="Logout"
        >
          <LogOut className="w-5 h-5 text-white/80" />
        </button>
      </div>

      {/* User Info Card */}
      <div className="mb-6 p-5 rounded-2xl bg-gradient-to-br from-[#00E0C6]/10 to-[#0097FF]/10 border border-[#00E0C6]/20">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="
            w-16 h-16 rounded-full flex-shrink-0
            bg-gradient-to-br from-[#00E0C6] to-[#0097FF]
            flex items-center justify-center
            text-[#0D0F14] font-bold text-xl
            shadow-[0_0_20px_rgba(0,224,198,0.35)]
          ">
            {initials}
          </div>

          {/* User Details */}
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEdit();
                  }}
                  placeholder="Your full name"
                  autoFocus
                  className="
                    w-full bg-white/10 border border-white/20 rounded-xl
                    px-3 py-2 text-white text-sm
                    focus:outline-none focus:border-[#00E0C6]/60
                    placeholder-white/30
                  "
                />
                {nameError && (
                  <p className="text-red-400 text-xs">{nameError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveName}
                    disabled={nameSaving}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#00E0C6]/20 border border-[#00E0C6]/40 text-[#00E0C6] text-xs font-semibold hover:bg-[#00E0C6]/30 transition disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                    {nameSaving ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 text-xs font-semibold hover:bg-white/10 transition"
                  >
                    <X className="w-3 h-3" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-white font-bold text-lg truncate">{name}</p>
                <button
                  onClick={handleStartEdit}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition"
                  aria-label="Edit name"
                >
                  <Pencil className="w-3.5 h-3.5 text-white/40 hover:text-white/70" />
                </button>
              </div>
            )}
            {!editingName && (
              <>
                <p className="text-white/60 text-sm mt-0.5 truncate">{email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 rounded-lg bg-[#00E0C6]/20 text-[#00E0C6] text-xs font-semibold">
                    Member
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-6">
        <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Your Stats
        </h2>
        
        
        {/* Favourites  */}
        <div className="grid grid-cols-2 gap-3">
          
          <button 
            onClick={onOpenFavorites}
            className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition text-left"
          >
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-yellow-400" />
              <p className="text-white/50 text-xs">Favourites</p>
            </div>
             <p className="text-white font-bold text-2xl">
              {statsLoading ? "…" : stats.favoriteStations}
            </p>
          </button>

                    {/* Searches - coming soon */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-4 h-4 text-[#00E0C6]" />
              <p className="text-white/50 text-xs">Searches</p>
            </div>
            <p className="text-white/40 font-bold text-2xl">—</p>
          </div>

          {/* Fuel Savings - coming soon */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Fuel className="w-4 h-4 text-green-400" />
              <p className="text-white/50 text-xs">Saved</p>
            </div>
              <p className="text-white/40 font-bold text-xl">—</p>
          </div>

          {/* CO2 - coming soon */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-400" />
              <p className="text-white/50 text-xs">CO₂ Saved</p>
            </div>
            <p className="text-white/40 font-bold text-xl">—</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </h2>

        <div className="space-y-2">
          <button className="
            w-full p-4 rounded-2xl 
            bg-white/5 border border-white/10
            hover:bg-white/10 transition
            flex items-center justify-between
            text-left
          ">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white font-semibold">Edit Profile</p>
                <p className="text-white/50 text-xs">Update your information</p>
              </div>
            </div>
            <span className="text-white/40">›</span>
          </button>

          <button 
            onClick={onOpenFavorites}
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Star className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white font-semibold">Favorite Stations</p>
                <p className="text-white/50 text-xs">Manage your saved stations</p>
              </div>
            </div>
            <span className="text-white/40">›</span>
          </button>

        
          <button 
            onClick={onOpenSettings}
            className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-white/60" />
              <div>
                <p className="text-white font-semibold">Preferences</p>
                <p className="text-white/50 text-xs">Customize your experience</p>
              </div>
            </div>
            <span className="text-white/40">›</span>
          </button>
        </div>
      </div>

      {/* About Section */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
        <p className="text-sm text-white/60 font-semibold mb-2">About WaySave</p>
        <p className="text-xs text-white/40 leading-relaxed">
          Version 1.0.0 • Made with ❤️ for smarter refueling
        </p>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="mt-6 w-full py-3 rounded-2xl bg-white/5 border border-white/10 
        text-white/80 font-semibold hover:bg-red-500/10 
        hover:border-red-500/30 transition flex items-center justify-center gap-2"
      >
        <LogOut className="w-5 h-5" />
        Log out
      </button>
    </div>
  );
}
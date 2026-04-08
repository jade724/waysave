import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { PostgrestError, Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import type { UserPreferences } from "./preferences";

/* ---------- Types ---------- */

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export type Profile = {
  id: string;
  full_name: string | null;
  created_at: string;
  preferences: UserPreferences | null; // 🔹 Step 6
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  profile: Profile | null;
  profileLoading: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<SignUpResult>;
  signOut: () => Promise<void>;

  refreshSession: () => Promise<void>;

  // 🔹 Step 6
  updatePreferences: (prefs: UserPreferences) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ---------- Provider ---------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  /* ---------- Session helpers ---------- */

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    applySession(data.session ?? null);
  }, [applySession]);

  /* ---------- Profile helpers ---------- */

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, created_at, preferences")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as Profile | null;
  }, []);

  const createProfileIfMissing = useCallback(async (u: User) => {
    const fullName =
      (u.user_metadata?.full_name as string | undefined) ?? null;

    const { error } = await supabase.from("profiles").insert({
      id: u.id,
      full_name: fullName,
      preferences: null,
    });

    // Ignore duplicate insert (race condition)
    if (error) {
      const code = (error as PostgrestError).code;
      if (code !== "23505") throw error;
    }
  }, []);

  /* ---------- Initial auth restore ---------- */

  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (mounted) applySession(data.session ?? null);
      } catch (e) {
        console.error("[Auth] getSession failed", e);
        if (mounted) applySession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  /* ---------- Load profile when user changes ---------- */

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        let p = await fetchProfile(user.id);

        if (!p) {
          await createProfileIfMissing(user);
          p = await fetchProfile(user.id);
        }

        if (!cancelled) setProfile(p);
      } catch (e) {
        console.error("[Profile] load failed", e);
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchProfile, createProfileIfMissing, user]);

  /* ---------- Auth actions ---------- */

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) throw error;
      applySession(data.session ?? null);
    },
    [applySession]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName ? { data: { full_name: fullName } } : undefined,
      });

      if (error) throw error;

      applySession(data.session ?? null);
      return { needsEmailConfirmation: !data.session };
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    applySession(null);
    setProfile(null);
  }, [applySession]);

  /* ---------- Step 6: save preferences ---------- */

  const updatePreferences = useCallback(
    async (prefs: UserPreferences) => {
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({ preferences: prefs })
        .eq("id", user.id);

      if (error) throw error;

      setProfile((prev) =>
        prev ? { ...prev, preferences: prefs } : prev
      );
    },
    [user]
  );

  /* ---------- Context value ---------- */

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      profile,
      profileLoading,
      signIn,
      signUp,
      signOut,
      refreshSession,
      updatePreferences, // 🔹 Step 6
    }),
    [
      session,
      user,
      loading,
      profile,
      profileLoading,
      signIn,
      signUp,
      signOut,
      refreshSession,
      updatePreferences,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

/* ---------- Hook ---------- */

/** Consumer hook for {@link AuthProvider}. */
// Fast refresh expects one component export per file; the hook is intentionally co-located with the provider.
// eslint-disable-next-line react-refresh/only-export-components -- useAuth must live beside AuthProvider
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export type Profile = {
  id: string; // uuid
  full_name: string | null;
  created_at: string;
};

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  // Phase 3: profile state
  profile: Profile | null;
  profileLoading: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;

  // Useful in Phase 3 (after profile updates)
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Phase 3 state
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?.user ?? null);
    // Do not setProfile here; profile is loaded in the effect below.
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    applySession(data.session ?? null);
  }, [applySession]);

  // --- Phase 3 helpers ---
  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw error;
    return (data ?? null) as Profile | null;
  }, []);

  const createProfileIfMissing = useCallback(
    async (u: User) => {
      const fullNameFromMetadata =
        (u.user_metadata?.full_name as string | undefined) ?? null;

      // Insert must pass RLS check: auth.uid() = id
      const { error } = await supabase.from("profiles").insert({
        id: u.id,
        full_name: fullNameFromMetadata,
      });

      // If it already exists (race condition), ignore. Otherwise throw.
      if (error) {
        // Postgres unique violation is usually code "23505"
        // Supabase may expose it as error.code or message; we safely allow duplicates.
        const code = (error as any).code as string | undefined;
        if (code !== "23505") throw error;
      }
    },
    []
  );

  // Restore session on app load + listen for auth changes (your Phase 2 logic)
  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          applySession(data.session ?? null);
        }
      } catch (e) {
        console.error("[Auth] getSession failed", e);

        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          console.log(`[Auth] Retrying (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(initAuth, 1000 * retryCount);
          return;
        }

        if (mounted) applySession(null);
      } finally {
        if (mounted && (retryCount >= MAX_RETRIES || retryCount === 0)) {
          setLoading(false);
        }
      }
    }

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      applySession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  // ✅ Phase 3: whenever we have a user, load (and if needed create) their profile
  useEffect(() => {
    let cancelled = false;

    async function load() {
      // No user = logged out; clear profile state
      if (!user) {
        setProfile(null);
        setProfileLoading(false);
        return;
      }

      setProfileLoading(true);

      try {
        // 1) Try fetch
        let p = await fetchProfile(user.id);

        // 2) If missing, create then fetch again
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

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchProfile, createProfileIfMissing, user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      applySession(data.session ?? null);
      // Profile will be loaded by the effect once user is set
    },
    [applySession]
  );

  const signUp = useCallback(
    async (email: string, password: string, fullName?: string): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName ? { data: { full_name: fullName } } : undefined,
      });

      if (error) throw error;

      // If email confirmations are enabled, session will be null here.
      // We cannot insert into profiles until the user is authenticated.
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
    }),
    [session, user, loading, profile, profileLoading, signIn, signUp, signOut, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>.");
  }
  return ctx;
}

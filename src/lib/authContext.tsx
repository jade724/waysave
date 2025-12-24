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

export type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;

  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    fullName?:  string
  ) => Promise<SignUpResult>;
  signOut:  () => Promise<void>;

  // Useful in Phase 3 (after profile updates)
  refreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextSession: Session | null) => {
    setSession(nextSession);
    setUser(nextSession?. user ??  null);
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase. auth.getSession();
    if (error) throw error;
    applySession(data.session ??  null);
  }, [applySession]);

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;

    // 1) Restore session on app load (persistent login) with retry logic
    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (mounted) {
          applySession(data.session ?? null);
        }
      } catch (e) {
        console.error("[Auth] getSession failed", e);

        // Retry on network errors (exponential backoff)
        if (retryCount < MAX_RETRIES && mounted) {
          retryCount++;
          console.log(`[Auth] Retrying (${retryCount}/${MAX_RETRIES})...`);
          setTimeout(initAuth, 1000 * retryCount); // 1s, 2s, 3s delays
          return;
        }

        // Max retries reached or other error
        if (mounted) applySession(null);
      } finally {
        // Only stop loading after all retries exhausted or success
        if (mounted && (retryCount >= MAX_RETRIES || retryCount === 0)) {
          setLoading(false);
        }
      }
    }

    initAuth();

    // 2) Listen for auth changes (login/logout/token refresh)
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

  const signIn = useCallback(
    async (email:  string, password: string) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Update immediately for smooth UI (onAuthStateChange will also fire)
      applySession(data.session ?? null);
    },
    [applySession]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?:  string
    ): Promise<SignUpResult> => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: fullName ?  { data: { full_name: fullName } } :  undefined,
      });

      if (error) throw error;

      // If email confirmations are enabled, session will be null here. 
      applySession(data.session ?? null);

      return { needsEmailConfirmation: ! data.session };
    },
    [applySession]
  );

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    applySession(null);
  }, [applySession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      loading,
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [session, user, loading, signIn, signUp, signOut, refreshSession]
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
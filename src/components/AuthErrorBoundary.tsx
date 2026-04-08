import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "../lib/authContext";

export default function AuthErrorBoundary({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Clear timeout UI when auth resolves (adjust state during render; avoids setState-in-effect lint).
  if (!loading && timedOut) {
    setTimedOut(false);
  }

  useEffect(() => {
    if (!loading) return;

    const t = window.setTimeout(() => {
      setTimedOut(true);
    }, 10000);

    return () => window.clearTimeout(t);
  }, [loading]);

  if (timedOut) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0A0D14] text-white px-6">
        <div className="text-center max-w-sm">
          <p className="text-xl mb-3">⚠️ Authentication Error</p>
          <p className="text-white/60 text-sm mb-6">
            Auth initialization is taking too long. Check your Supabase env vars
            and project settings, then retry.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#0097FF] rounded-lg text-[#0A0D14] font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

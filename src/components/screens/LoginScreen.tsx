// LoginScreen.tsx
import { useState } from "react";
import { signIn } from "../../lib/auth";

interface LoginScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export default function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      await signIn(email, password);
      onLogin();
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-between px-8 py-16 bg-[#0D0F14]">
      {/* Logo */}
      <div className="flex flex-col items-center mt-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center shadow-[0_0_45px_rgba(0,224,198,0.45)]">
          <span className="text-3xl text-[#0D0F14] font-bold">W</span>
        </div>
        <h1 className="text-4xl mt-6 font-semibold text-white tracking-tight">
          WaySave
        </h1>
        <p className="text-white/50 text-sm mt-1">Save on every journey</p>
      </div>

      {/* Form */}
      <div className="space-y-4">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl bg-[#1A1D26] px-4 py-4 text-white placeholder-white/40 outline-none border border-white/5 focus:border-[#00E0C6]"
          placeholder="Email address"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl bg-[#1A1D26] px-4 py-4 text-white placeholder-white/40 outline-none border border-white/5 focus:border-[#00E0C6]"
          placeholder="Password"
          type="password"
        />

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="
            w-full py-4 rounded-2xl 
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-semibold
            shadow-[0_0_25px_rgba(0,224,198,0.35)]
            active:scale-[0.98] transition
            disabled:opacity-60
          "
        >
          {loading ? "Logging in..." : "Log In"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-5">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social buttons (UI only for now) */}
        <div className="flex gap-4">
          <button className="flex-1 py-3.5 rounded-2xl bg-[#1A1D26] border border-white/10 text-white text-sm">
             Apple
          </button>
          <button className="flex-1 py-3.5 rounded-2xl bg-[#1A1D26] border border-white/10 text-white text-sm">
            Google
          </button>
        </div>
      </div>

      {/* Sign Up link */}
      <div className="text-center mt-8 text-sm">
        <span className="text-white/50">Don&apos;t have an account? </span>
        <button
          onClick={onSignup}
          className="text-[#00E0C6] font-semibold"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}

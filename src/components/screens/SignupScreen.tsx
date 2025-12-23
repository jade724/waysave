// SignupScreen.tsx
import { useState } from "react";
import { signUp } from "../../lib/auth";

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess: () => void;
}

export default function SignupScreen({
  onBack,
  onSignupSuccess,
}: SignupScreenProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setError(null);
    setLoading(true);

    try {
      await signUp(email, password);
      onSignupSuccess();
    } catch (err: any) {
      setError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-between px-8 py-16 bg-[#0D0F14]">
      {/* Back */}
      <button
        onClick={onBack}
        className="absolute left-6 top-8 bg-[#1A1D26] p-3 rounded-xl border border-white/10 hover:border-white/30 transition"
      >
        ←
      </button>

      {/* Logo */}
      <div className="flex flex-col items-center mt-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center shadow-[0_0_35px_rgba(0,224,198,0.45)]">
          <span className="text-2xl text-[#0D0F14] font-bold">W</span>
        </div>
        <h1 className="text-3xl mt-4 font-semibold text-white">
          Create Account
        </h1>
        <p className="text-white/50 text-xs mt-1">
          Start saving on every trip
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4 mt-4">
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full rounded-2xl bg-[#1A1D26] px-4 py-4 text-white placeholder-white/40 outline-none border border-white/5 focus:border-[#00E0C6]"
          placeholder="Full name"
        />

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
          onClick={handleSignup}
          disabled={loading}
          className="
            w-full py-4 mt-2 rounded-2xl 
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-semibold
            shadow-[0_0_25px_rgba(0,224,198,0.35)]
            active:scale-[0.98] transition
            disabled:opacity-60
          "
        >
          {loading ? "Creating the account..." : "Create Account"}
        </button>
      </div>

      <div />
    </div>
  );
}

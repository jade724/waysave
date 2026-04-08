// src/components/screens/SignupScreen.tsx
import { useState } from "react";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../../lib/authContext";

interface SignupScreenProps {
  onBack: () => void;
  onSignupSuccess: () => void;
}

export default function SignupScreen({
  onBack,
  onSignupSuccess,
}: SignupScreenProps) {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Password strength indicator
  const getPasswordStrength = () => {
    if (!password) return { strength: 0, label: "" };
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    const labels = ["", "Weak", "Fair", "Good", "Strong"];
    const colors = ["", "text-red-400", "text-orange-400", "text-yellow-400", "text-green-400"];
    
    return { strength, label: labels[strength], color: colors[strength] };
  };

  const passwordStrength = getPasswordStrength();

  const handleSignup = async () => {
    setError(null);
    setInfo(null);

    // Validation
    if (!fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email address");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await signUp(email, password, fullName);

      if (result.needsEmailConfirmation) {
        setInfo(
          "Account created! Please check your email to confirm your account, then come back and log in."
        );
        return;
      }

      onSignupSuccess();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleSignup();
    }
  };

  return (
    <div className="h-full w-full flex flex-col justify-between px-8 py-16 bg-[#0D0F14] overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="
          absolute left-6 top-8 
          bg-[#1A1D26] p-3 rounded-xl 
          border border-white/10 
          hover:border-white/30 hover:bg-[#1E2233]
          transition-all
          flex items-center justify-center
        "
        aria-label="Go back"
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </button>

      {/* Logo Section */}
      <div className="flex flex-col items-center mt-10 animate-[fadeIn_0.6s_ease-out]">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00E0C6] to-[#0097FF] blur-2xl opacity-40 rounded-full" />
          
          {/* Logo */}
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center shadow-[0_0_35px_rgba(0,224,198,0.45)]">
            <span className="text-2xl text-[#0D0F14] font-bold">W</span>
          </div>
        </div>

        <h1 className="text-3xl mt-4 font-semibold text-white">
          Create Account
        </h1>
        <p className="text-white/50 text-sm mt-2">
          Start saving on every trip
        </p>
      </div>

      {/* Form */}
      <div className="space-y-4 mt-4 animate-[fadeIn_0.8s_ease-out]">
        {/* Full Name Input */}
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            onKeyPress={handleKeyDown}
            className="
              w-full rounded-2xl bg-[#1A1D26] 
              pl-12 pr-4 py-4 
              text-white placeholder-white/40 
              outline-none border border-white/5 
              focus:border-[#00E0C6] focus:bg-[#1E2233]
              transition-all duration-200
            "
            placeholder="Full name"
            autoComplete="name"
          />
        </div>

        {/* Email Input */}
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyDown}
            className="
              w-full rounded-2xl bg-[#1A1D26] 
              pl-12 pr-4 py-4 
              text-white placeholder-white/40 
              outline-none border border-white/5 
              focus:border-[#00E0C6] focus:bg-[#1E2233]
              transition-all duration-200
            "
            placeholder="Email address"
            autoComplete="email"
          />
        </div>

        {/* Password Input */}
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyDown}
            className="
              w-full rounded-2xl bg-[#1A1D26] 
              pl-12 pr-12 py-4 
              text-white placeholder-white/40 
              outline-none border border-white/5 
              focus:border-[#00E0C6] focus:bg-[#1E2233]
              transition-all duration-200
            "
            placeholder="Password (min. 8 characters)"
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60 transition"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {password && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <div
                  key={level}
                  className={`
                    h-1 flex-1 rounded-full transition-all
                    ${level <= passwordStrength.strength
                      ? passwordStrength.strength === 1 ? 'bg-red-400'
                      : passwordStrength.strength === 2 ? 'bg-orange-400'
                      : passwordStrength.strength === 3 ? 'bg-yellow-400'
                      : 'bg-green-400'
                      : 'bg-white/10'
                    }
                  `}
                />
              ))}
            </div>
            {passwordStrength.label && (
              <p className={`text-xs ${passwordStrength.color}`}>
                Password strength: {passwordStrength.label}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="
              bg-red-500/10 border border-red-500/30 
              rounded-xl p-3 
              flex items-start gap-2
              animate-[fadeIn_0.3s_ease-out]
            "
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {info && (
          <div className="
            bg-green-500/10 border border-green-500/30 
            rounded-xl p-3 
            flex items-start gap-2
            animate-[fadeIn_0.3s_ease-out]
          ">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">{info}</p>
          </div>
        )}

        {/* Terms Notice */}
        <p className="text-xs text-white/40 text-center leading-relaxed">
          By creating an account, you agree to our{" "}
          <button className="text-[#00E0C6] hover:underline">Terms of Service</button>
          {" "}and{" "}
          <button className="text-[#00E0C6] hover:underline">Privacy Policy</button>
        </p>

        {/* Create Account Button */}
        <button
          onClick={handleSignup}
          disabled={loading}
          className="
            w-full py-4 mt-2 rounded-2xl 
            bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
            text-[#0D0F14] font-bold text-lg
            shadow-[0_0_25px_rgba(0,224,198,0.35)]
            active:scale-[0.98] transition-all
            disabled:opacity-60 disabled:cursor-not-allowed
            hover:shadow-[0_0_35px_rgba(0,224,198,0.45)]
          "
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-[#0D0F14]/20 border-t-[#0D0F14] rounded-full animate-spin" />
              Creating account...
            </span>
          ) : (
            "Create Account"
          )}
        </button>
      </div>

      <div />
    </div>
  );
}
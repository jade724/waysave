// src/components/screens/LoginScreen.tsx
import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../../lib/authContext";
import { supabase } from "../../lib/supabaseClient";

interface LoginScreenProps {
  onLogin: () => void;
  onSignup: () => void;
}

export default function LoginScreen({ onLogin, onSignup }: LoginScreenProps) {
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);


  const handleLogin = async () => {
    setError(null);
    
    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      onLogin();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleLogin();
    }
  };
  const handleForgotPassword = async () => {
    if (!email) {
      setError("Enter your email address above, then tap Forgot password.");
      return;
    }
    setResetLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      setResetSent(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to send reset email.";
      setError(message);
    } finally {
      setResetLoading(false);
    }
  };


  return (
    <div className="h-full w-full flex flex-col justify-between px-8 py-16 bg-[#0D0F14] overflow-y-auto">
      {/* Logo Section */}
      <div className="flex flex-col items-center mt-4 animate-[fadeIn_0.6s_ease-out]">
        <div className="relative">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00E0C6] to-[#0097FF] blur-2xl opacity-50 rounded-full" />
          
          {/* Logo */}
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center shadow-[0_0_45px_rgba(0,224,198,0.45)]">
            <span className="text-3xl text-[#0D0F14] font-bold">W</span>
          </div>
        </div>

        <h1 className="text-4xl mt-6 font-semibold text-white tracking-tight">
          WaySave
        </h1>
        <p className="text-white/50 text-sm mt-2">Save on every journey</p>
      </div>

      {/* Form */}
      <div className="space-y-4 animate-[fadeIn_0.8s_ease-out]">
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
            placeholder="Password"
            autoComplete="current-password"
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

        {/* Reset email confirmation */}
        {resetSent && (
          <div
            role="alert"
            className="
              bg-green-500/10 border border-green-500/30 
              rounded-xl p-3 
              flex items-start gap-2
              animate-[fadeIn_0.3s_ease-out]
            "
          >
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-400 text-sm">
              Password reset email sent. Check your inbox.
            </p>
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <button
            onClick={handleForgotPassword}
            disabled={resetLoading}
            className="text-[#00E0C6] text-sm hover:underline disabled:opacity-50"
          >
            {resetLoading ? "Sending…" : "Forgot password?"}
          </button>
        </div>

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="
            w-full py-4 rounded-2xl 
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
              Logging in...
            </span>
          ) : (
            "Log In"
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-white/30 text-xs">or continue with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social buttons */}
        <div className="flex gap-3">
          <button className="
            flex-1 py-3.5 rounded-2xl 
            bg-[#1A1D26] border border-white/10 
            text-white text-sm font-medium
            hover:bg-[#1E2233] hover:border-white/20
            transition-all
            flex items-center justify-center gap-2
          ">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Apple
          </button>
          <button className="
            flex-1 py-3.5 rounded-2xl 
            bg-[#1A1D26] border border-white/10 
            text-white text-sm font-medium
            hover:bg-[#1E2233] hover:border-white/20
            transition-all
            flex items-center justify-center gap-2
          ">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
        </div>
      </div>

      {/* Sign Up link */}
      <div className="text-center mt-8 text-sm animate-[fadeIn_1s_ease-out]">
        <span className="text-white/50">Don&apos;t have an account? </span>
        <button 
          onClick={onSignup} 
          className="text-[#00E0C6] font-semibold hover:underline transition"
        >
          Sign Up
        </button>
      </div>
    </div>
  );
}
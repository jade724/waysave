// src/components/screens/StationUpdateSubmittedScreen.tsx

import { CheckCircle, TrendingUp, Users } from "lucide-react";

interface Props {
  onBack: () => void;
}

export default function StationUpdateSubmittedScreen({
  onBack,
}: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0F14] px-6 text-center">
      {/* Success Icon with Animation */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[#00E0C6]/20 blur-3xl rounded-full" />
        <div className="relative animate-[fadeIn_0.5s_ease-out]">
          <CheckCircle className="w-20 h-20 text-[#00E0C6] animate-[scaleIn_0.3s_ease-out]" />
        </div>
      </div>

      {/* Success Message */}
      <h1 className="text-white text-3xl font-bold mb-3 animate-[fadeIn_0.6s_ease-out]">
        Update Submitted!
      </h1>

      <p className="text-white/60 text-base mb-8 max-w-sm animate-[fadeIn_0.7s_ease-out]">
        Thanks for helping keep station information accurate for the community.
      </p>

      {/* Info Cards */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        <div className="
          bg-white/5 border border-white/10 
          rounded-2xl p-4
          flex items-center gap-3
          animate-[fadeIn_0.8s_ease-out]
        ">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E0C6] to-[#0097FF] flex items-center justify-center">
            <TrendingUp size={20} className="text-[#0D0F14]" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Price Updated</p>
            <p className="text-white/50 text-xs">Your update is now live</p>
          </div>
        </div>

        <div className="
          bg-white/5 border border-white/10 
          rounded-2xl p-4
          flex items-center gap-3
          animate-[fadeIn_0.9s_ease-out]
        ">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Users size={20} className="text-white/70" />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">Helping Others</p>
            <p className="text-white/50 text-xs">Other drivers will see your update</p>
          </div>
        </div>
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        className="
          px-8 py-4 rounded-2xl
          bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
          text-[#0D0F14] font-bold text-lg
          shadow-[0_0_20px_rgba(0,224,198,0.35)]
          active:scale-95 transition
          animate-[fadeIn_1s_ease-out]
        "
      >
        Back to Map
      </button>
    </div>
  );
}
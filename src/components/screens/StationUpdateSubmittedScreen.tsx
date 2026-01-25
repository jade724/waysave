// src/components/screens/StationUpdateSubmittedScreen.tsx

import { CheckCircle } from "lucide-react";

interface Props {
  onBackToHome: () => void;
}

export default function StationUpdateSubmittedScreen({
  onBackToHome,
}: Props) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0F14] px-6 text-center">
      <CheckCircle className="w-16 h-16 text-[#00E0C6] mb-4" />

      <h1 className="text-white text-2xl font-semibold mb-2">
        Update Submitted
      </h1>

      <p className="text-white/50 text-sm mb-8">
        Thanks for helping keep station information up to date.
      </p>

      <button
        onClick={onBackToHome}
        className="
          px-6 py-3 rounded-xl
          bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
          text-[#0D0F14] font-semibold
          active:scale-95 transition
        "
      >
        Back to Map
      </button>
    </div>
  );
}

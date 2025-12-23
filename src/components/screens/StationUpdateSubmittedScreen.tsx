// StationUpdateSubmittedScreen.tsx

import { ThumbsUp } from "lucide-react";

interface Props {
  onBackToHome: () => void;
}

export default function StationUpdateSubmittedScreen({ onBackToHome }: Props) {
  return (
    <div className="w-full h-full bg-[#0D0F14] flex flex-col items-center justify-center px-6">

      <div
        className="
          w-28 h-28 rounded-full
          bg-gradient-to-br from-[#00E0C6] to-[#0097FF]
          flex items-center justify-center
          shadow-[0_0_40px_rgba(0,224,198,0.4)]
          mb-6
        "
      >
        <ThumbsUp className="w-12 h-12 text-[#0D0F14]" />
      </div>

      <h2 className="text-white text-3xl font-semibold mb-2">Thank you!</h2>
      <p className="text-white/60 text-center text-sm max-w-xs mb-10">
        Your update helps other drivers save time and money.
      </p>

      <button
        onClick={onBackToHome}
        className="
          w-full py-4 rounded-2xl
          bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
          text-[#0D0F14] font-semibold
          shadow-[0_0_22px_rgba(0,224,198,0.35)]
          active:scale-95 transition
        "
      >
        Back to Home
      </button>
    </div>
  );
}

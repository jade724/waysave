// src/shared/ToggleSegment.tsx

interface ToggleSegmentProps {
  leftLabel: string;
  rightLabel: string;
  active: "left" | "right";
  onChange: (value: "left" | "right") => void;
}

export default function ToggleSegment({
  leftLabel,
  rightLabel,
  active,
  onChange,
}: ToggleSegmentProps) {
  return (
    <div className="flex gap-2 bg-[#12151c] p-1.5 rounded-2xl border border-white/10 shadow-inner">
      {/* Left */}
      <button
        onClick={() => onChange("left")}
        className={`
          flex-1 py-3 rounded-2xl text-sm font-medium transition
          ${
            active === "left"
              ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
              : "text-white/60"
          }
        `}
      >
        {leftLabel}
      </button>

      {/* Right */}
      <button
        onClick={() => onChange("right")}
        className={`
          flex-1 py-3 rounded-2xl text-sm font-medium transition
          ${
            active === "right"
              ? "bg-gradient-to-r from-[#00E0C6] to-[#0097FF] text-[#0D0F14]"
              : "text-white/60"
          }
        `}
      >
        {rightLabel}
      </button>
    </div>
  );
}

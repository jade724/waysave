// src/shared/GradientButton.tsx

interface GradientButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export default function GradientButton({
  children,
  onClick,
  className = "",
}: GradientButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full py-4 rounded-2xl
        bg-gradient-to-r from-[#00E0C6] to-[#0097FF]
        text-[#0D0F14] font-semibold
        shadow-[0_0_22px_rgba(0,224,198,0.35)]
        active:scale-95 transition
        ${className}
      `}
    >
      {children}
    </button>
  );
}

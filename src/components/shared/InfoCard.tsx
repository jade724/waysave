// src/shared/InfoCard.tsx

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

export default function InfoCard({ icon, title, subtitle }: InfoCardProps) {
  return (
    <div
      className="
        bg-[#1A1D26]
        border border-white/10 
        rounded-xl p-3 text-center
        flex flex-col items-center
        shadow-[0_6px_20px_rgba(0,0,0,0.35)]
        text-white/90 text-xs
      "
    >
      <div className="mb-2">{icon}</div>
      <span className="text-white text-sm font-medium">{title}</span>
      <span className="text-white/50 text-[11px] mt-1">{subtitle}</span>
    </div>
  );
}

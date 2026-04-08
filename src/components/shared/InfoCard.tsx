interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  gradient?: string;
}

export default function InfoCard({
  icon,
  title,
  subtitle,
  gradient = "from-[#00E0C6]/10 to-[#0097FF]/10",
}: InfoCardProps) {
  return (
    <div
      className="
        group
        bg-gradient-to-br from-white/5 to-white/[0.02]
        border border-white/10
        rounded-2xl p-5
        flex flex-col items-center text-center
        shadow-lg
        transition-all duration-300
        hover:border-white/20
        hover:-translate-y-1
        hover:shadow-[0_8px_30px_rgba(0,224,198,0.15)]
        cursor-pointer
      "
    >
      {/* Icon */}
      <div
        className={`
          mb-4 w-14 h-14 rounded-2xl
          flex items-center justify-center
          bg-gradient-to-br ${gradient}
          border border-white/10
          group-hover:scale-110
          group-hover:shadow-[0_0_20px_rgba(0,224,198,0.3)]
          transition-all duration-300
        `}
      >
        <div className="text-[#00E0C6] group-hover:scale-110 transition-transform">
          {icon}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-white text-base font-bold mb-2 group-hover:text-[#00E0C6] transition-colors">
        {title}
      </h3>

      {/* Subtitle */}
      <p className="text-xs text-white/50 leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}
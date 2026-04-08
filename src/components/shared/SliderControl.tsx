// src/shared/SliderControl.tsx

interface SliderControlProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}

export default function SliderControl({
  label,
  value,
  min = 0,
  max = 100,
  onChange,
}: SliderControlProps) {
  return (
    <div className="mb-6">
      <h2 className="text-white/70 text-sm mb-3">{label}</h2>

      <input
        type="range"
        className="w-full accent-[#00E0C6]"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(Number(e.target.value))}
      />

      <p className="text-white/60 text-xs mt-1">{value}</p>
    </div>
  );
}

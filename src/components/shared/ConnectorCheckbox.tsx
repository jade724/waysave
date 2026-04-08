// src/shared/ConnectorCheckbox.tsx

interface ConnectorCheckboxProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

export default function ConnectorCheckbox({
  label,
  checked,
  onToggle,
}: ConnectorCheckboxProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        w-full p-4 rounded-xl flex items-center justify-between
        border transition
        ${
          checked
            ? "bg-[#00E0C6]/15 border-[#00E0C6]/40 text-[#00E0C6]"
            : "bg-[#1A1D26] border-white/10 text-white/50"
        }
      `}
    >
      <span>{label}</span>

      <div
        className={`
          w-5 h-5 rounded-full border flex items-center justify-center
          ${
            checked
              ? "border-[#00E0C6] bg-[#00E0C6]"
              : "border-white/20"
          }
        `}
      />
    </button>
  );
}

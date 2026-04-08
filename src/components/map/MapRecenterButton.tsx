import { Navigation } from "lucide-react";

/*
  MapRecenterButton
  ------------------
  This is the floating circular button on the map that lets the user
  re-center the camera to their current location.

  It does NOT move the map itself — it signals the parent to do it.
*/

interface Props {
  onPress: () => void;
  className?: string; // lets parent position the button (top-right)
}

export default function MapRecenterButton({ onPress, className = "" }: Props) {
  return (
    <button
      onClick={onPress}
      className={`
        absolute z-[1000]
        p-3 
        bg-[#1A1D26] 
        border border-white/10
        rounded-full 
        shadow-[0_0_20px_rgba(0,224,198,0.25)]
        hover:border-white/25
        transition
        ${className}
      `}
    >
      <Navigation className="w-5 h-5 text-[#00E0C6]" strokeWidth={2} />
    </button>
  );
}

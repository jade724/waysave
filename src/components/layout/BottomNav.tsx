// src/components/layout/BottomNav.tsx

import { Home, Map, SlidersHorizontal, User } from "lucide-react";
import type { Screen } from "../../App";

// Props provide the current screen and a way to navigate.
interface Props {
  current: Screen;
  onNavigate: (screen: Screen) => void;
}

export default function BottomNav({ current, onNavigate }: Props) {
  // Each nav item maps to a screen and an icon.
  const navItems = [
    { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
    { id: "map", label: "Map", icon: <Map className="w-5 h-5" /> },
    {
      id: "filters",
      label: "Filters",
      icon: <SlidersHorizontal className="w-5 h-5" />,
    },
    { id: "profile", label: "Profile", icon: <User className="w-5 h-5" /> },
  ] as const;

  // Some screens (details, submitted) still highlight the Map tab.
  const activeId =
    current === "filters"
      ? "filters"
      : current === "profile"
      ? "profile"
      : current === "map" ||
        current === "station-details" ||
        current === "station-update-submitted"
      ? "map"
      : "home";

  // Wrapper to keep the JSX clean.
  const handleClick = (id: (typeof navItems)[number]["id"]) => {
    onNavigate(id);
  };

  return (
    <nav
      className="
        fixed bottom-6 left-1/2 -translate-x-1/2
        w-[360px] h-[78px]
        bg-[#12151c]/95 backdrop-blur-xl
        border border-white/5
        rounded-3xl
        shadow-[0_0_40px_-15px_rgba(0,224,198,0.25)]
        flex items-center justify-around
        px-3
      "
      aria-label="Primary"
    >
      {navItems.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            onClick={() => handleClick(item.id)}
            className={`
              flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition
              ${
                active
                  ? "text-[#00E0C6] shadow-[0_0_14px_rgba(0,224,198,0.35)] bg-white/5"
                  : "text-white/40 hover:text-white/60"
              }
            `}
            aria-current={active ? "page" : undefined}
          >
            {item.icon}
            <span className="text-[10px]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

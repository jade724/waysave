import type { ReactNode } from "react";

export default function ScreenWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="w-full h-full overflow-y-auto px-5 pb-6 pt-6">
      {children}
    </div>
  );
}

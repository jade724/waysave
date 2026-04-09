import { useEffect, useState } from "react";
import { Download, Wifi, X } from "lucide-react";
import { registerSW } from "virtual:pwa-register";

/**
 * Registers the Vite PWA service worker and surfaces update / offline-ready UI.
 * (Replaces bare console.log callbacks from main.tsx.)
 */
export default function PwaUpdateNotifier() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState(false);

  useEffect(() => {
    registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onOfflineReady() {
        setOfflineBanner(true);
      },
    });
  }, []);

  return (
    <>
      {needRefresh && (
        <div
          className="fixed top-3 left-3 right-3 z-[80] max-w-md mx-auto flex items-center gap-3 rounded-2xl border border-[#00E0C6]/30 bg-[#0D0F14]/95 backdrop-blur-xl px-4 py-3 shadow-lg"
          role="alert"
        >
          <Download className="w-5 h-5 shrink-0 text-[#00E0C6]" aria-hidden />
          <p className="flex-1 text-sm text-white/90">
            A new version of WaySave is ready.
          </p>
          <button
            type="button"
            className="shrink-0 rounded-xl bg-gradient-to-r from-[#00E0C6] to-[#0097FF] px-3 py-1.5 text-xs font-bold text-[#0D0F14]"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
          <button
            type="button"
            className="shrink-0 p-1 rounded-lg text-white/50 hover:text-white hover:bg-white/10"
            aria-label="Dismiss update notice"
            onClick={() => setNeedRefresh(false)}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {offlineBanner && (
        <div
          className="fixed top-3 left-3 right-3 z-[75] max-w-md mx-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-[#12151c]/95 backdrop-blur-xl px-4 py-2.5 shadow-lg"
          role="status"
        >
          <Wifi className="w-4 h-4 shrink-0 text-[#00E0C6]" aria-hidden />
          <p className="flex-1 text-xs text-white/75">
            Cached — you can use the app offline.
          </p>
          <button
            type="button"
            className="text-xs font-semibold text-[#00E0C6] px-2 py-1 rounded-lg hover:bg-white/5"
            onClick={() => setOfflineBanner(false)}
          >
            OK
          </button>
        </div>
      )}
    </>
  );
}

import { useEffect } from "react";
import { fetchUserFavorites } from "../api/favorites";
import { fetchPriceUpdatesSince } from "../api/priceAlertUpdates";
import { useI18n } from "../lib/i18n/i18nContext";
import {
  getPriceAlertSinceIso,
  setPriceAlertSinceIso,
} from "../lib/priceAlertCursor";
import { useToast } from "../lib/toastContext";

const POLL_MS = 90_000;

interface Props {
  enabled: boolean;
  userId: string | undefined;
}

/**
 * Polls for new community prices on favourited stations while the app is open.
 */
export default function PriceAlertMonitor({ enabled, userId }: Props) {
  const { t } = useI18n();
  const { showToast } = useToast();

  useEffect(() => {
    if (!enabled || !userId) return;

    let cancelled = false;

    async function poll() {
      if (cancelled || document.visibilityState !== "visible" || !userId) return;

      let since = getPriceAlertSinceIso();
      if (!since) {
        since = new Date().toISOString();
        setPriceAlertSinceIso(since);
        return;
      }

      try {
        const favourites = await fetchUserFavorites(userId);
        const names = [
          ...new Set(
            favourites.map((s) => s.name).filter((n): n is string => Boolean(n))
          ),
        ];

        if (names.length === 0) return;

        const rows = await fetchPriceUpdatesSince(names, since);
        if (cancelled || rows.length === 0) return;

        let latest = since;
        for (const row of rows) {
          const price = row.new_price.toFixed(3);
          const gradeLabel =
            row.fuel_grade === "petrol"
              ? t("price_alerts_grade_petrol")
              : row.fuel_grade === "diesel"
                ? t("price_alerts_grade_diesel")
                : t("price_alerts_grade_legacy");
          showToast(
            t("price_alerts_toast", { name: row.station_name, price, grade: gradeLabel }),
            "info"
          );

          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            new Notification(t("price_alerts_notification_title"), {
              body: t("price_alerts_notification_body", {
                name: row.station_name,
                price,
                grade: gradeLabel,
              }),
            });
          }

          if (row.created_at > latest) latest = row.created_at;
        }
        setPriceAlertSinceIso(latest);
      } catch (e) {
        console.error("[PriceAlertMonitor]", e);
      }
    }

    void poll();
    const timer = setInterval(() => void poll(), POLL_MS);

    const onVis = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, userId, showToast, t]);

  return null;
}

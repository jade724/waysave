import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { AppLocale, MessageKey } from "./messages";
import { translate as translateMessage } from "./helpers";

export type { AppLocale, MessageKey };

type I18nValue = {
  locale: AppLocale;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | undefined>(undefined);

export function I18nProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  const t = useCallback(
    (key: MessageKey, vars?: Record<string, string | number>) =>
      translateMessage(locale, key, vars),
    [locale]
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- hook paired with I18nProvider
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFS, loadPrefs, savePrefs, type UserPreferences } from "./preferences";

function createMemoryStorage(): Storage {
  const memory: Record<string, string> = {};
  return {
    get length() {
      return Object.keys(memory).length;
    },
    clear() {
      for (const k of Object.keys(memory)) delete memory[k];
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null;
    },
    key(index: number) {
      const keys = Object.keys(memory);
      return keys[index] ?? null;
    },
    removeItem(key: string) {
      delete memory[key];
    },
    setItem(key: string, value: string) {
      memory[key] = value;
    },
  } as Storage;
}

describe("loadPrefs / savePrefs", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryStorage());
  });

  it("returns defaults when storage is empty", () => {
    const p = loadPrefs();
    expect(p.locale).toBe("en");
    expect(p.priceAlertsEnabled).toBe(false);
    expect(p.maxDistanceKm).toBe(DEFAULT_PREFS.maxDistanceKm);
  });

  it("persists and reloads custom preferences", () => {
    const custom: UserPreferences = {
      ...DEFAULT_PREFS,
      maxDistanceKm: 42,
      locale: "ga",
      priceAlertsEnabled: true,
    };
    savePrefs(custom);
    const roundTrip = loadPrefs();
    expect(roundTrip.maxDistanceKm).toBe(42);
    expect(roundTrip.locale).toBe("ga");
    expect(roundTrip.priceAlertsEnabled).toBe(true);
  });

  it("migrates legacy v1 storage into v2", () => {
    localStorage.setItem(
      "waysave_prefs_v1",
      JSON.stringify({ maxDistanceKm: 15.5, preference: "cheapest" })
    );
    const p = loadPrefs();
    expect(p.maxDistanceKm).toBe(15.5);
    expect(p.preference).toBe("cheapest");
    expect(p.locale).toBe("en");
    expect(localStorage.getItem("waysave_prefs_v2")).toBeTruthy();
    expect(localStorage.getItem("waysave_prefs_v1")).toBeNull();
  });

  it("ignores invalid locale values", () => {
    localStorage.setItem(
      "waysave_prefs_v2",
      JSON.stringify({ ...DEFAULT_PREFS, locale: "fr" })
    );
    expect(loadPrefs().locale).toBe("en");
  });
});

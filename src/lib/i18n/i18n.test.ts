import { describe, expect, it } from "vitest";
import { formatPrefsSummaryLine, greetingForHour, translate } from "./helpers";
import { DEFAULT_PREFS } from "../preferences";

describe("translate", () => {
  it("returns Irish strings for ga locale", () => {
    expect(translate("ga", "nav_home")).toBe("Baile");
    expect(translate("en", "nav_home")).toBe("Home");
  });

  it("interpolates placeholders", () => {
    expect(
      translate("en", "price_alerts_toast", {
        name: "Test Station",
        price: "1.234",
        grade: "Petrol",
      })
    ).toContain("Test Station");
    expect(
      translate("en", "price_alerts_toast", {
        name: "Test Station",
        price: "1.234",
        grade: "Petrol",
      })
    ).toContain("1.234");
  });
});

describe("formatPrefsSummaryLine", () => {
  it("formats English summary", () => {
    const line = formatPrefsSummaryLine(
      { ...DEFAULT_PREFS, activeTab: "fuel", maxDistanceKm: 20, preference: "nearest" },
      "en"
    );
    expect(line).toContain("Fuel");
    expect(line).toContain("20");
  });

  it("formats Irish summary", () => {
    const line = formatPrefsSummaryLine(
      { ...DEFAULT_PREFS, activeTab: "ev", maxDistanceKm: 0, preference: "fastest" },
      "ga"
    );
    expect(line.length).toBeGreaterThan(5);
  });
});

describe("greetingForHour", () => {
  it("selects time-of-day bucket", () => {
    expect(greetingForHour("en", 9)).toBe("Good morning");
    expect(greetingForHour("en", 14)).toBe("Good afternoon");
    expect(greetingForHour("en", 20)).toBe("Good evening");
    expect(greetingForHour("ga", 9)).toBe("Maidin mhaith");
  });
});

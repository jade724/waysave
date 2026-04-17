import { describe, expect, it } from "vitest";
import { DEFAULT_PREFS } from "./preferences";
import {
  effectiveEVSearchRadiusKm,
  effectiveSearchRadiusKm,
  matchesEvHardwareFilters,
  matchesFuelTypeFilter,
} from "./stationFilters";
import type { Station } from "../types/station";

describe("effectiveSearchRadiusKm", () => {
  it("uses fallback when distance is invalid", () => {
    expect(effectiveSearchRadiusKm(undefined)).toBe(30);
    expect(effectiveSearchRadiusKm(0)).toBe(30);
    expect(effectiveSearchRadiusKm(-1)).toBe(30);
  });

  it("caps at 50 km", () => {
    expect(effectiveSearchRadiusKm(100)).toBe(50);
  });

  it("passes through positive values under the cap", () => {
    expect(effectiveSearchRadiusKm(12)).toBe(12);
  });
});

describe("effectiveEVSearchRadiusKm", () => {
  it("defaults to 50 when unset or non-positive", () => {
    expect(effectiveEVSearchRadiusKm(undefined)).toBe(50);
    expect(effectiveEVSearchRadiusKm(0)).toBe(50);
  });

  it("caps at 100 km", () => {
    expect(effectiveEVSearchRadiusKm(200)).toBe(100);
  });
});

describe("matchesFuelTypeFilter", () => {
  const base: Station = {
    id: "1",
    externalId: "1",
    name: "Test",
    lat: 0,
    lng: 0,
    type: "fuel",
    fuelTypes: "both",
  };

  it("allows any fuel when filter is null", () => {
    expect(matchesFuelTypeFilter(base, null)).toBe(true);
  });

  it("matches petrol filter for both-only forecourts", () => {
    expect(matchesFuelTypeFilter({ ...base, fuelTypes: "both" }, "petrol")).toBe(true);
  });
});

describe("matchesEvHardwareFilters", () => {
  const ev = (partial: Partial<Station>): Station => ({
    id: "ev1",
    name: "Charger",
    lat: 0,
    lng: 0,
    type: "ev",
    evMaxPowerKw: 50,
    evHasAc: true,
    evHasDc: true,
    ...partial,
  });

  const prefs = { ...DEFAULT_PREFS };

  it("allows any fuel station", () => {
    expect(
      matchesEvHardwareFilters(
        { id: "f", name: "Fuel", lat: 0, lng: 0, type: "fuel" },
        prefs
      )
    ).toBe(true);
  });

  it("filters by minimum kW", () => {
    expect(matchesEvHardwareFilters(ev({ evMaxPowerKw: 50 }), { ...prefs, evMinPowerKw: 49 })).toBe(
      true
    );
    expect(matchesEvHardwareFilters(ev({ evMaxPowerKw: 50 }), { ...prefs, evMinPowerKw: 51 })).toBe(
      false
    );
    expect(matchesEvHardwareFilters(ev({ evMaxPowerKw: null }), { ...prefs, evMinPowerKw: 1 })).toBe(
      false
    );
  });

  it("filters by AC/DC requirements", () => {
    expect(
      matchesEvHardwareFilters(ev({ evHasAc: false, evHasDc: true }), {
        ...prefs,
        evRequireAc: true,
      })
    ).toBe(false);
    expect(
      matchesEvHardwareFilters(ev({ evHasAc: true, evHasDc: false }), {
        ...prefs,
        evRequireDc: true,
      })
    ).toBe(false);
    expect(
      matchesEvHardwareFilters(ev({ evHasAc: true, evHasDc: true }), {
        ...prefs,
        evRequireAc: true,
        evRequireDc: true,
      })
    ).toBe(true);
  });
});

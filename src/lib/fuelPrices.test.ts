import { describe, expect, it } from "vitest";
import { effectiveFuelPriceEurPerL } from "./fuelPrices";
import type { Station } from "../types/station";

const baseFuel = (over: Partial<Station>): Station => ({
  id: "1",
  externalId: "1",
  name: "Test",
  lat: 0,
  lng: 0,
  type: "fuel",
  fuelTypes: "both",
  ...over,
});

describe("effectiveFuelPriceEurPerL", () => {
  it("uses petrol or diesel when both known", () => {
    const s = baseFuel({
      fuelPrices: { petrol: 1.5, diesel: 1.6 },
    });
    expect(effectiveFuelPriceEurPerL(s, "petrol")).toBe(1.5);
    expect(effectiveFuelPriceEurPerL(s, "diesel")).toBe(1.6);
    expect(effectiveFuelPriceEurPerL(s, null)).toBe(1.5);
    expect(effectiveFuelPriceEurPerL(s, "both")).toBe(1.5);
  });

  it("falls back to legacy price_value", () => {
    const s = baseFuel({ price_value: 1.55 });
    expect(effectiveFuelPriceEurPerL(s, "petrol")).toBe(1.55);
  });

  it("does not use petrol for diesel when only petrol is known", () => {
    const s = baseFuel({
      fuelPrices: { petrol: 1.5, diesel: null },
      price_value: 1.5,
    });
    expect(effectiveFuelPriceEurPerL(s, "diesel")).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { effectiveFuelPriceEurPerL, parseFuelPriceUserInput } from "./fuelPrices";
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

describe("parseFuelPriceUserInput", () => {
  it("accepts €/L (under threshold) and sign-style c/L (e.g. 195.9)", () => {
    expect(parseFuelPriceUserInput("1.919")).toEqual({ ok: true, eurPerL: 1.919 });
    expect(parseFuelPriceUserInput("2.55")).toEqual({ ok: true, eurPerL: 2.55 });
    expect(parseFuelPriceUserInput("191,9")).toEqual({ ok: true, eurPerL: 1.919 });
    expect(parseFuelPriceUserInput("191.9")).toEqual({ ok: true, eurPerL: 1.919 });
    expect(parseFuelPriceUserInput("195.9")).toEqual({ ok: true, eurPerL: 1.959 });
    expect(parseFuelPriceUserInput("208.9")).toEqual({ ok: true, eurPerL: 2.089 });
    expect(parseFuelPriceUserInput("125")).toEqual({ ok: true, eurPerL: 1.25 });
  });

  it("rejects out-of-range values", () => {
    expect(parseFuelPriceUserInput("1.15").ok).toBe(false);
    expect(parseFuelPriceUserInput("3.01").ok).toBe(false);
    expect(parseFuelPriceUserInput("115").ok).toBe(false); // 115 c/L → €1.15/L
  });
});

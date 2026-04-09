import { describe, expect, it } from "vitest";
import { calculateDistanceKm } from "./distance";

describe("calculateDistanceKm", () => {
  it("returns ~0 for identical points", () => {
    expect(calculateDistanceKm(53.35, -6.26, 53.35, -6.26)).toBeLessThan(0.001);
  });

  it("returns a plausible distance for two Dublin-area points", () => {
    const km = calculateDistanceKm(53.3498, -6.2603, 53.3194, -6.3706);
    expect(km).toBeGreaterThan(5);
    expect(km).toBeLessThan(20);
  });
});

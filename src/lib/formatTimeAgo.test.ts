import { describe, expect, it } from "vitest";
import { formatTimeAgo, maxIsoTimestamps } from "./formatTimeAgo";

describe("maxIsoTimestamps", () => {
  it("returns the latest ISO string", () => {
    expect(maxIsoTimestamps(["2020-01-01T00:00:00Z", "2021-01-01T00:00:00Z"])).toBe(
      "2021-01-01T00:00:00Z"
    );
  });
});

describe("formatTimeAgo", () => {
  it("formats recent times", () => {
    const now = new Date();
    const iso = new Date(now.getTime() - 5 * 60_000).toISOString();
    expect(formatTimeAgo(iso)).toMatch(/min ago/);
  });
});

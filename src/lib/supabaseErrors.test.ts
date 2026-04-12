import { describe, expect, it } from "vitest";
import { describeStationUpdateError } from "./supabaseErrors";

describe("describeStationUpdateError", () => {
  it("detects missing column errors", () => {
    expect(
      describeStationUpdateError({ message: 'column "fuel_grade" does not exist' })
    ).toMatch(/missing a column/i);
    expect(
      describeStationUpdateError({ message: 'column "fuel_grade" does not exist' })
    ).toContain("price-reports-and-storage");
  });

  it("detects RLS errors", () => {
    expect(
      describeStationUpdateError({ message: "new row violates row-level security policy" })
    ).toContain("Supabase blocked");
  });
});

import { describe, expect, it } from "vitest";
import { compareVersions } from "../src/main/services/update-service";

describe("compareVersions", () => {
  it("compares semantic versions", () => {
    expect(compareVersions("0.1.4", "0.1.3")).toBeGreaterThan(0);
    expect(compareVersions("v0.2.0", "0.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "1.0.0")).toBe(0);
    expect(compareVersions("0.1.2", "0.1.3")).toBeLessThan(0);
  });
});

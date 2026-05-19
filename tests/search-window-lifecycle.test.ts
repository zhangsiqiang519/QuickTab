import { describe, expect, it } from "vitest";
import { shouldKeepSearchWindowResident } from "../src/main/services/search-window-lifecycle";

describe("search window lifecycle", () => {
  it("keeps the search window resident on macOS and Windows", () => {
    expect(shouldKeepSearchWindowResident("darwin")).toBe(true);
    expect(shouldKeepSearchWindowResident("win32")).toBe(true);
  });

  it("allows idle destroy on unsupported platforms", () => {
    expect(shouldKeepSearchWindowResident("linux")).toBe(false);
  });
});

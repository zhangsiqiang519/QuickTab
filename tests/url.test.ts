import { describe, expect, it } from "vitest";
import { isAllowedUrl, normalizeUrl, redactUrl } from "../src/main/services/url";

describe("url utilities", () => {
  it("normalizes URL tracking parameters and hashes", () => {
    expect(normalizeUrl("https://Example.com/path/?utm_source=x&ok=1#section")).toBe("https://example.com/path?ok=1");
  });

  it("blocks dangerous URL schemes by default", () => {
    expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
    expect(isAllowedUrl("data:text/html,hello")).toBe(false);
    expect(isAllowedUrl("https://example.com")).toBe(true);
  });

  it("redacts sensitive query parameters", () => {
    expect(redactUrl("https://example.com/callback?code=abc&state=ok")).toContain("code=%5BREDACTED%5D");
  });
});

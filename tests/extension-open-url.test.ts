import { describe, expect, it, vi } from "vitest";
import { openUrlInFocusedWindow } from "../extension/chromium/open-url.js";

describe("extension open url", () => {
  it("focuses the existing browser window before opening a new active tab", async () => {
    const windowsUpdate = vi.fn().mockResolvedValue(undefined);
    const tabsCreate = vi.fn().mockResolvedValue({ id: 99 });

    await openUrlInFocusedWindow(
      {
        windows: {
          getLastFocused: vi.fn().mockResolvedValue({ id: 12, type: "normal" }),
          update: windowsUpdate
        },
        tabs: {
          create: tabsCreate
        }
      },
      "https://example.com/new"
    );

    expect(windowsUpdate).toHaveBeenNthCalledWith(1, 12, { focused: true });
    expect(tabsCreate).toHaveBeenCalledWith({ windowId: 12, url: "https://example.com/new", active: true });
    expect(windowsUpdate).toHaveBeenNthCalledWith(2, 12, { focused: true });
  });

  it("falls back to creating an active tab when no normal window is available", async () => {
    const windowsUpdate = vi.fn().mockResolvedValue(undefined);
    const tabsCreate = vi.fn().mockResolvedValue({ id: 100 });

    await openUrlInFocusedWindow(
      {
        windows: {
          getLastFocused: vi.fn().mockResolvedValue(undefined),
          update: windowsUpdate
        },
        tabs: {
          create: tabsCreate
        }
      },
      "https://example.com/fallback"
    );

    expect(windowsUpdate).not.toHaveBeenCalled();
    expect(tabsCreate).toHaveBeenCalledWith({ url: "https://example.com/fallback", active: true });
  });
});

import { describe, expect, it } from "vitest";
import { formatShortcutFromKeyEvent, validateShortcutSyntax } from "../src/main/services/shortcut";

describe("shortcut utilities", () => {
  it("formats keyboard events as Electron accelerators", () => {
    expect(formatShortcutFromKeyEvent({ key: "k", code: "KeyK", metaKey: true, shiftKey: true })).toBe("CommandOrControl+Shift+K");
    expect(formatShortcutFromKeyEvent({ key: " ", code: "Space", altKey: true })).toBe("Alt+Space");
  });

  it("uses the physical key code when option changes the typed character", () => {
    expect(formatShortcutFromKeyEvent({ key: "„", code: "KeyK", altKey: true, shiftKey: true })).toBe("Alt+Shift+K");
    expect(formatShortcutFromKeyEvent({ key: "¡", code: "Digit1", altKey: true })).toBe("Alt+1");
  });

  it("rejects shortcuts that are reserved or missing a real key", () => {
    expect(validateShortcutSyntax("CommandOrControl+Q")).toMatchObject({ ok: false, reason: "reserved" });
    expect(validateShortcutSyntax("Alt")).toMatchObject({ ok: false, reason: "modifier_only" });
    expect(validateShortcutSyntax("K")).toMatchObject({ ok: false, reason: "missing_modifier" });
    expect(validateShortcutSyntax("Shift+K")).toMatchObject({ ok: false, reason: "missing_modifier" });
  });

  it("allows an empty shortcut so the user can disable the global hotkey", () => {
    expect(validateShortcutSyntax("")).toMatchObject({ ok: true, normalized: "" });
  });
});

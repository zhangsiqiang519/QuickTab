export interface ShortcutKeyEvent {
  key: string;
  code?: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export interface ShortcutValidation {
  ok: boolean;
  reason?: "empty" | "modifier_only" | "missing_modifier" | "reserved" | "conflict" | "invalid";
  normalized?: string;
}

const MODIFIER_KEYS = new Set(["Alt", "Control", "Meta", "Shift", "OS", "Command", "CommandOrControl"]);
const RESERVED_SHORTCUTS = new Set(["CommandOrControl+Q", "CommandOrControl+W", "Escape", "CommandOrControl+,"]);

const KEY_ALIASES: Record<string, string> = {
  " ": "Space",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
  Esc: "Escape",
  Return: "Enter"
};

export function formatShortcutFromKeyEvent(event: ShortcutKeyEvent): string {
  if (MODIFIER_KEYS.has(event.key)) return "";
  const mainKey = normalizeMainKey(readPhysicalKey(event) ?? event.key);
  if (!mainKey) return "";

  const parts: string[] = [];
  if (event.metaKey || event.ctrlKey) parts.push("CommandOrControl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey) parts.push("Shift");
  parts.push(mainKey);
  return parts.join("+");
}

function readPhysicalKey(event: ShortcutKeyEvent): string | undefined {
  if (!event.code) return undefined;
  if (/^Key[A-Z]$/.test(event.code)) return event.code.slice(3);
  if (/^Digit[0-9]$/.test(event.code)) return event.code.slice(5);
  if (/^Numpad[0-9]$/.test(event.code)) return event.code.slice(6);
  if (event.code === "Space") return "Space";
  if (event.code === "Minus") return "-";
  if (event.code === "Equal") return "=";
  if (event.code === "BracketLeft") return "[";
  if (event.code === "BracketRight") return "]";
  if (event.code === "Backslash") return "\\";
  if (event.code === "Semicolon") return ";";
  if (event.code === "Quote") return "'";
  if (event.code === "Comma") return ",";
  if (event.code === "Period") return ".";
  if (event.code === "Slash") return "/";
  return undefined;
}

export function normalizeShortcut(value: string): string {
  return value
    .split("+")
    .map((part) => normalizeShortcutPart(part.trim()))
    .filter(Boolean)
    .join("+");
}

export function validateShortcutSyntax(value: string): ShortcutValidation {
  const normalized = normalizeShortcut(value);
  if (!normalized) return { ok: true, reason: "empty", normalized: "" };

  const parts = normalized.split("+");
  const mainKey = parts.at(-1);
  if (!mainKey || MODIFIER_KEYS.has(mainKey)) return { ok: false, reason: "modifier_only", normalized };
  if (!parts.slice(0, -1).some((part) => ["CommandOrControl", "Command", "Control", "Alt"].includes(part))) {
    return { ok: false, reason: "missing_modifier", normalized };
  }
  if (RESERVED_SHORTCUTS.has(normalized)) return { ok: false, reason: "reserved", normalized };
  return { ok: true, normalized };
}

function normalizeMainKey(key: string): string {
  if (KEY_ALIASES[key]) return KEY_ALIASES[key];
  if (/^F(?:[1-9]|1[0-9]|2[0-4])$/i.test(key)) return key.toUpperCase();
  if (key.length === 1) return key.toUpperCase();
  return key;
}

function normalizeShortcutPart(part: string): string {
  const lower = part.toLowerCase();
  if (["cmdorctrl", "commandorcontrol", "cmdctrl"].includes(lower)) return "CommandOrControl";
  if (["cmd", "command", "meta"].includes(lower)) return "Command";
  if (["ctrl", "control"].includes(lower)) return "Control";
  if (["option", "opt", "alt"].includes(lower)) return "Alt";
  if (lower === "shift") return "Shift";
  return normalizeMainKey(part);
}

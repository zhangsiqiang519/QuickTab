const SENSITIVE_QUERY_KEYS = new Set(["token", "code", "session", "secret", "auth", "password", "key"]);
const TRACKING_QUERY_PREFIXES = ["utm_"];
const TRACKING_QUERY_KEYS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid"]);

export function isAllowedUrl(rawUrl: string, allowFileUrls = false): boolean {
  try {
    const url = ensureUrl(rawUrl);
    if (url.protocol === "http:" || url.protocol === "https:") return true;
    if (allowFileUrls && url.protocol === "file:") return true;
    return false;
  } catch {
    return false;
  }
}

export function ensureUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed)) {
    return new URL(trimmed);
  }
  if (/^(localhost|\d{1,3}(?:\.\d{1,3}){3}|[\w-]+\.[\w.-]+)/i.test(trimmed)) {
    return new URL(`https://${trimmed}`);
  }
  throw new Error("Input is not a URL or domain");
}

export function normalizeUrl(rawUrl: string): string {
  const url = ensureUrl(rawUrl);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_QUERY_KEYS.has(key) || TRACKING_QUERY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      url.searchParams.delete(key);
    }
  }
  if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
    url.port = "";
  }
  if (url.pathname !== "/" && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

export function getDomain(rawUrl: string): string {
  try {
    return ensureUrl(rawUrl).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function getPathText(rawUrl: string): string {
  try {
    const url = ensureUrl(rawUrl);
    return decodeURIComponent(url.pathname.replace(/[/-]+/g, " ").trim());
  } catch {
    return "";
  }
}

export function redactUrl(rawUrl: string): string {
  try {
    const url = ensureUrl(rawUrl);
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        url.searchParams.set(key, "[REDACTED]");
      }
    }
    return url.toString();
  } catch {
    return rawUrl.replace(/([?&](?:token|code|session|secret|auth|password|key)=)[^&\s]+/gi, "$1[REDACTED]");
  }
}

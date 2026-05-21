import { app } from "electron";
import type { UpdateStatus } from "../shared.js";

const LATEST_RELEASE_API = "https://api.github.com/repos/zhangsiqiang519/QuickTab/releases/latest";
export const RELEASES_URL = "https://github.com/zhangsiqiang519/QuickTab/releases";
const RELEASE_HOST = "github.com";
const RELEASE_PATH_PREFIX = "/zhangsiqiang519/QuickTab/releases";

interface GitHubRelease {
  tag_name?: string;
  html_url?: string;
  assets?: Array<{
    name?: string;
    browser_download_url?: string;
  }>;
}

export async function checkForUpdates(): Promise<UpdateStatus> {
  const currentVersion = app.getVersion();
  try {
    const response = await fetch(LATEST_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `QuickTab/${currentVersion}`
      }
    });

    if (!response.ok) {
      return {
        currentVersion,
        updateAvailable: false,
        releaseUrl: RELEASES_URL,
        message: `GitHub release check failed: ${response.status}`
      };
    }

    const release = (await response.json()) as GitHubRelease;
    const latestVersion = normalizeVersion(release.tag_name ?? "");
    const updateAvailable = latestVersion ? compareVersions(latestVersion, currentVersion) > 0 : false;
    return {
      currentVersion,
      latestVersion: latestVersion || undefined,
      updateAvailable,
      releaseUrl: getAllowedUpdateUrl(release.html_url) ?? RELEASES_URL,
      assetUrl: findPlatformDownloadUrl(release, process.platform),
      message: updateAvailable ? undefined : "QuickTab is up to date."
    };
  } catch (error) {
    return {
      currentVersion,
      updateAvailable: false,
      releaseUrl: RELEASES_URL,
      message: error instanceof Error ? error.message : String(error)
    };
  }
}

export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] ?? 0) - (right[index] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

function parseVersion(value: string): number[] {
  return normalizeVersion(value)
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
}

function normalizeVersion(value: string): string {
  return value.trim().replace(/^v/i, "");
}

export function findPlatformDownloadUrl(release: GitHubRelease, platform: NodeJS.Platform): string | undefined {
  const assets = release.assets ?? [];
  if (platform === "win32") {
    return getAllowedUpdateUrl(assets.find((asset) => asset.name?.endsWith(".exe"))?.browser_download_url);
  }
  if (platform === "darwin") {
    return getAllowedUpdateUrl(assets.find((asset) => asset.name?.endsWith(".dmg"))?.browser_download_url)
      ?? getAllowedUpdateUrl(assets.find((asset) => asset.name?.includes("mac") && asset.name.endsWith(".zip"))?.browser_download_url);
  }
  return undefined;
}

export function getAllowedUpdateUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return undefined;
    if (url.hostname !== RELEASE_HOST) return undefined;
    if (!url.pathname.startsWith(RELEASE_PATH_PREFIX)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

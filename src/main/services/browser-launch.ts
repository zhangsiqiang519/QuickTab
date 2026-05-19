export interface BrowserUrlLaunchOptions {
  platform: NodeJS.Platform;
  browserId: string;
  appName: string;
  url: string;
  execFileAsync: (file: string, args: string[], options?: { timeout?: number }) => Promise<unknown>;
  openExternal: (url: string) => Promise<void>;
  logger?: {
    info?: (message: string, metadata?: Record<string, unknown>) => void | Promise<void>;
    warn?: (message: string, metadata?: Record<string, unknown>) => void | Promise<void>;
  };
}

export async function openBrowserUrlWithFallback(options: BrowserUrlLaunchOptions): Promise<void> {
  const explicitLaunch = getExplicitLaunchCommand(options.platform, options.browserId, options.appName, options.url);
  if (explicitLaunch) {
    try {
      await options.execFileAsync(explicitLaunch.file, explicitLaunch.args, { timeout: 2_000 });
      await options.logger?.info?.("Browser launched directly", {
        browserId: options.browserId,
        url: options.url,
        file: explicitLaunch.file
      });
      return;
    } catch (error) {
      await options.logger?.warn?.("Direct browser launch failed", {
        browserId: options.browserId,
        url: options.url,
        file: explicitLaunch.file,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  await options.openExternal(options.url);
  await options.logger?.info?.("Browser URL opened via shell fallback", {
    browserId: options.browserId,
    url: options.url
  });
}

function getExplicitLaunchCommand(
  platform: NodeJS.Platform,
  browserId: string,
  appName: string,
  url: string
): { file: string; args: string[] } | undefined {
  if (platform === "darwin") {
    return { file: "open", args: ["-a", appName, url] };
  }
  if (platform === "win32") {
    if (browserId === "edge") return { file: "msedge.exe", args: [url] };
    if (browserId === "chrome") return { file: "chrome.exe", args: [url] };
  }
  return undefined;
}

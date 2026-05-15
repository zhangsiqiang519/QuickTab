import type { BrowserId, BrowserSource } from "../shared.js";

const AUTOMATION_EXTENSION_ID = "macos-automation";
const AUTOMATION_PROFILE_ID = "macos-automation";

export function selectBrowserExtensionSource(
  sources: BrowserSource[],
  browserId: Extract<BrowserId, "chrome" | "edge">
): BrowserSource | undefined {
  return sources.find((source) => {
    return source.browserId === browserId
      && source.connected
      && source.extensionId !== AUTOMATION_EXTENSION_ID
      && source.profileId !== AUTOMATION_PROFILE_ID;
  });
}

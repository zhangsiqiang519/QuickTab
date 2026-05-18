import { shell } from "electron";
import { BrowserId, CommandResult, NativeMessage, OpenTabRef, SearchResult } from "../shared.js";
import { CommandQueue } from "./command-queue.js";
import { IndexService } from "./index-service.js";
import { isAllowedUrl } from "./url.js";

export type NativeSender = (message: NativeMessage) => Promise<CommandResult | undefined>;
export type LocalBrowserActivator = (browserId: BrowserId, openTabRef: OpenTabRef, url?: string) => Promise<void>;

export class CommandRouter {
  constructor(
    private readonly index: IndexService,
    private readonly sendNativeCommand: NativeSender,
    private readonly commandQueue: CommandQueue,
    private readonly allowFileUrls: () => Promise<boolean>,
    private readonly getDefaultBrowser: () => Promise<BrowserId | "system">,
    private readonly activateLocalBrowserTab?: LocalBrowserActivator
  ) {}

  async executeResult(result: SearchResult): Promise<CommandResult> {
    const commandId = crypto.randomUUID();
    if (!isAllowedUrl(result.url, await this.allowFileUrls())) {
      return {
        success: false,
        commandId,
        action: "open_url",
        errorCode: "URL_NOT_ALLOWED",
        message: "This URL scheme is not allowed by QuickTab settings.",
        retryable: false
      };
    }

    if (result.openTabRef) {
      if (result.openTabRef.activationMode === "url") {
        const opened = await this.openUrl(commandId, result.url);
        if (opened.success) await this.index.recordUsage(result.itemId);
        return opened;
      }
      const activation = await this.activateTab(commandId, result.browserId, result.profileId, result.openTabRef, result.url);
      if (activation?.success) {
        await this.index.recordUsage(result.itemId);
      }
      return activation ?? {
        success: false,
        commandId,
        action: "activate_tab",
        errorCode: "TAB_ACTIVATION_UNAVAILABLE",
        message: "QuickTab could not send the activation command for this tab.",
        retryable: true
      };
    }

    const alreadyOpen = await this.index.findOpenTabByUrl(result.url, await this.getDefaultBrowser());
    if (alreadyOpen?.openTabRef) {
      const activation = await this.activateTab(commandId, alreadyOpen.browserId, alreadyOpen.profileId, alreadyOpen.openTabRef, alreadyOpen.url);
      if (activation?.success) {
        await this.index.recordUsage(result.itemId);
        return activation;
      }
      if (activation && !activation.retryable) return activation;
    }

    const opened = await this.openUrl(commandId, result.url);
    if (opened.success) await this.index.recordUsage(result.itemId);
    return opened;
  }

  private async activateTab(commandId: string, browserId: BrowserId, profileId: string, openTabRef: OpenTabRef, url?: string): Promise<CommandResult | undefined> {
    if (profileId === "macos-automation" || browserId === "safari") {
      if (!this.activateLocalBrowserTab) return undefined;
      try {
        await this.activateLocalBrowserTab(browserId, openTabRef, url);
        return {
          success: true,
          commandId,
          action: "activate_tab",
          message: `Activated ${browserId} tab.`,
          retryable: false
        };
      } catch (error) {
        return {
          success: false,
          commandId,
          action: "activate_tab",
          errorCode: "LOCAL_TAB_ACTIVATION_FAILED",
          message: `QuickTab could not activate this ${browserId} tab.`,
          technicalMessage: error instanceof Error ? error.message : String(error),
          retryable: true
        };
      }
    }
    return this.sendNativeCommand({
      messageId: commandId,
      protocolVersion: "1.0",
      type: "activate_tab",
      browserId,
      profileId,
      timestamp: Date.now(),
      payload: openTabRef
    });
  }

  async sendQueuedNativeCommand(message: NativeMessage): Promise<CommandResult | undefined> {
    await this.commandQueue.enqueue(message);
    return this.commandQueue.waitForResult(message.messageId);
  }

  async openUrl(commandId: string, url: string): Promise<CommandResult> {
    if (!isAllowedUrl(url, await this.allowFileUrls())) {
      return {
        success: false,
        commandId,
        action: "open_url",
        errorCode: "URL_NOT_ALLOWED",
        message: "QuickTab blocked an unsupported URL scheme.",
        retryable: false
      };
    }
    try {
      await shell.openExternal(url);
      return {
        success: true,
        commandId,
        action: "open_url",
        message: "Opened URL with the system browser.",
        retryable: false
      };
    } catch (error) {
      return {
        success: false,
        commandId,
        action: "open_url",
        errorCode: "OPEN_URL_FAILED",
        message: "QuickTab could not open this URL.",
        technicalMessage: error instanceof Error ? error.message : String(error),
        retryable: true
      };
    }
  }
}

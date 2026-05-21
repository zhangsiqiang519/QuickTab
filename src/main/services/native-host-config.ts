import { homedir } from "node:os";
import { join, posix, win32 } from "node:path";

export const NATIVE_HOST_NAME = "com.quicktab.ai";

export interface NativeHostManifest {
  name: string;
  description: string;
  path: string;
  type: "stdio";
  allowed_origins: string[];
}

export interface NativeHostInstallPlanInput {
  platform: NodeJS.Platform;
  extensionId: string;
  dataDir: string;
  runtimeBinary: string;
  hostScript: string;
  useElectronRunAsNode: boolean;
}

export interface NativeHostInstallPlan {
  runnerPath: string;
  runnerBody: string;
  manifest: NativeHostManifest;
  manifestPaths: string[];
  registryKeys: string[];
}

export function buildNativeHostInstallPlan(input: NativeHostInstallPlanInput): NativeHostInstallPlan {
  const runnerPath = nativeHostRunnerPath(input.platform, input.dataDir);
  const manifest: NativeHostManifest = {
    name: NATIVE_HOST_NAME,
    description: "QuickTab native messaging host",
    path: runnerPath,
    type: "stdio",
    allowed_origins: [`chrome-extension://${input.extensionId}/`]
  };

  return {
    runnerPath,
    runnerBody: nativeHostRunnerBody(input),
    manifest,
    manifestPaths: nativeHostManifestPaths(input.platform, input.dataDir),
    registryKeys: nativeHostRegistryKeys(input.platform)
  };
}

function nativeHostRunnerPath(platform: NodeJS.Platform, dataDir: string): string {
  const path = platform === "win32" ? win32 : posix;
  return path.join(dataDir, platform === "win32" ? "native-host-runner.cmd" : "native-host-runner");
}

function nativeHostRunnerBody(input: NativeHostInstallPlanInput): string {
  if (input.platform === "win32") {
    const lines = [
      "@echo off",
      `set "QUICKTAB_DATA_DIR=${input.dataDir}"`,
      ...(input.useElectronRunAsNode ? [`set "ELECTRON_RUN_AS_NODE=1"`] : []),
      `"${input.runtimeBinary}" "${input.hostScript}"`
    ];
    return `${lines.join("\r\n")}\r\n`;
  }

  const nodeMode = input.useElectronRunAsNode ? "ELECTRON_RUN_AS_NODE=1 " : "";
  return `#!/bin/sh\nQUICKTAB_DATA_DIR="${input.dataDir}" ${nodeMode}exec "${input.runtimeBinary}" "${input.hostScript}"\n`;
}

export function nativeHostManifestPaths(platform: NodeJS.Platform, dataDir: string): string[] {
  if (platform === "darwin") {
    return [
      join(homedir(), "Library/Application Support/Google/Chrome/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`),
      join(homedir(), "Library/Application Support/Microsoft Edge/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`)
    ];
  }
  if (platform === "win32") {
    return [win32.join(dataDir, `${NATIVE_HOST_NAME}.json`)];
  }
  return [
    join(homedir(), ".config/google-chrome/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`),
    join(homedir(), ".config/microsoft-edge/NativeMessagingHosts", `${NATIVE_HOST_NAME}.json`)
  ];
}

export function nativeHostRegistryKeys(platform: NodeJS.Platform): string[] {
  if (platform !== "win32") return [];
  return [
    `HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`,
    `HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\${NATIVE_HOST_NAME}`
  ];
}

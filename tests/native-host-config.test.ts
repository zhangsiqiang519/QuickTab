import { describe, expect, it } from "vitest";
import { buildNativeHostInstallPlan } from "../src/main/services/native-host-config";

describe("native host install plan", () => {
  it("uses a Windows cmd runner and Chrome/Edge registry keys on win32", () => {
    const plan = buildNativeHostInstallPlan({
      platform: "win32",
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
      dataDir: "C:\\Users\\me\\.quicktab-ai",
      runtimeBinary: "C:\\Program Files\\QuickTab\\QuickTab.exe",
      hostScript: "C:\\Program Files\\QuickTab\\resources\\app.asar\\dist\\src\\main\\native\\native-host.js",
      useElectronRunAsNode: true
    });

    expect(plan.runnerPath).toBe("C:\\Users\\me\\.quicktab-ai\\native-host-runner.cmd");
    expect(plan.runnerBody).toContain("@echo off");
    expect(plan.runnerBody).toContain("set QUICKTAB_DATA_DIR=C:\\Users\\me\\.quicktab-ai");
    expect(plan.runnerBody).toContain("set ELECTRON_RUN_AS_NODE=1");
    expect(plan.manifest.path).toBe(plan.runnerPath);
    expect(plan.manifest.allowed_origins).toEqual(["chrome-extension://abcdefghijklmnopabcdefghijklmnop/"]);
    expect(plan.registryKeys).toEqual([
      "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\com.quicktab.ai",
      "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\com.quicktab.ai"
    ]);
  });

  it("keeps Unix shell runners for non-Windows platforms", () => {
    const plan = buildNativeHostInstallPlan({
      platform: "darwin",
      extensionId: "abcdefghijklmnopabcdefghijklmnop",
      dataDir: "/Users/me/.quicktab-ai",
      runtimeBinary: "/Applications/QuickTab.app/Contents/MacOS/QuickTab",
      hostScript: "/Applications/QuickTab.app/Contents/Resources/app.asar/dist/src/main/native/native-host.js",
      useElectronRunAsNode: true
    });

    expect(plan.runnerPath).toBe("/Users/me/.quicktab-ai/native-host-runner");
    expect(plan.runnerBody).toContain("#!/bin/sh");
    expect(plan.runnerBody).toContain("ELECTRON_RUN_AS_NODE=1");
    expect(plan.registryKeys).toEqual([]);
  });
});

export function shouldKeepSearchWindowResident(platform: NodeJS.Platform): boolean {
  return platform === "darwin" || platform === "win32";
}

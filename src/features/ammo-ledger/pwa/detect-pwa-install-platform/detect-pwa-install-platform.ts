export type PwaInstallPlatform = "ios" | "android" | "other";

export function detectPwaInstallPlatform({ userAgent }: { userAgent: string }): PwaInstallPlatform {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(normalizedUserAgent)) {
    return "ios";
  }

  if (/android/.test(normalizedUserAgent)) {
    return "android";
  }

  return "other";
}

export function isPwaInstalled({
  displayModeStandalone,
  navigatorStandalone,
}: {
  displayModeStandalone: boolean;
  navigatorStandalone: boolean;
}): boolean {
  return displayModeStandalone || navigatorStandalone;
}

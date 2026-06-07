import { describe, expect, it } from "vitest";
import {
  detectPwaInstallPlatform,
  isPwaInstalled,
} from "@/features/ammo-ledger/pwa/detect-pwa-install-platform/detect-pwa-install-platform";

describe("detectPwaInstallPlatform", () => {
  it("iOS 端末を判定する", () => {
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
      }),
    ).toBe("ios");
  });

  it("Android 端末を判定する", () => {
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36",
      }),
    ).toBe("android");
  });

  it("その他の端末を other とする", () => {
    expect(
      detectPwaInstallPlatform({
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      }),
    ).toBe("other");
  });
});

describe("isPwaInstalled", () => {
  it("display-mode: standalone ならインストール済み", () => {
    expect(
      isPwaInstalled({
        displayModeStandalone: true,
        navigatorStandalone: false,
      }),
    ).toBe(true);
  });

  it("iOS の navigator.standalone ならインストール済み", () => {
    expect(
      isPwaInstalled({
        displayModeStandalone: false,
        navigatorStandalone: true,
      }),
    ).toBe(true);
  });

  it("どちらも false なら未インストール", () => {
    expect(
      isPwaInstalled({
        displayModeStandalone: false,
        navigatorStandalone: false,
      }),
    ).toBe(false);
  });
});

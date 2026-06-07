"use client";

import { useCallback, useEffect, useState } from "react";
import {
  detectPwaInstallPlatform,
  isPwaInstalled,
  type PwaInstallPlatform,
} from "@/features/ammo-ledger/pwa/detect-pwa-install-platform/detect-pwa-install-platform";

const bannerDismissStorageKey = "ammo-ledger-pwa-install-banner-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function readNavigatorStandalone(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }

  return "standalone" in navigator && navigator.standalone === true;
}

function readDisplayModeStandalone(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(display-mode: standalone)").matches;
}

function readBannerDismissed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(bannerDismissStorageKey) === "true";
}

export function useAmmoLedgerPwaInstall() {
  const [platform, setPlatform] = useState<PwaInstallPlatform>("other");
  const [installed, setInstalled] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [canNativeInstall, setCanNativeInstall] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(
    null,
  );

  useEffect(() => {
    setPlatform(
      detectPwaInstallPlatform({
        userAgent: window.navigator.userAgent,
      }),
    );
    setInstalled(
      isPwaInstalled({
        displayModeStandalone: readDisplayModeStandalone(),
        navigatorStandalone: readNavigatorStandalone(),
      }),
    );
    setBannerDismissed(readBannerDismissed());

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setCanNativeInstall(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setCanNativeInstall(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismissBanner = useCallback(() => {
    window.localStorage.setItem(bannerDismissStorageKey, "true");
    setBannerDismissed(true);
  }, []);

  const promptNativeInstall = useCallback(async () => {
    if (!installPromptEvent) {
      return false;
    }

    await installPromptEvent.prompt();
    const choice = await installPromptEvent.userChoice;
    const accepted = choice.outcome === "accepted";

    if (accepted) {
      setInstalled(true);
    }

    setInstallPromptEvent(null);
    setCanNativeInstall(false);

    return accepted;
  }, [installPromptEvent]);

  const shouldShowBanner =
    !installed && !bannerDismissed && (platform === "ios" || platform === "android");

  const shouldShowSettingsPanel = !installed && (platform === "ios" || platform === "android");

  return {
    platform,
    installed,
    canNativeInstall,
    shouldShowBanner,
    shouldShowSettingsPanel,
    dismissBanner,
    promptNativeInstall,
  };
}

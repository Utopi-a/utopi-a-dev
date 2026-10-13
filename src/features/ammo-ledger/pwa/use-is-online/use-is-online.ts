"use client";

import { useSyncExternalStore } from "react";

function subscribeConnectionChange(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/** 端末がネットワークにつながっているか。サーバー描画時はつながっている前提で描く。 */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    subscribeConnectionChange,
    () => navigator.onLine,
    () => true,
  );
}

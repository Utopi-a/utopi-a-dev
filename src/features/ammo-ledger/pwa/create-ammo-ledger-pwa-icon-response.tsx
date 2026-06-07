import { ImageResponse } from "next/og";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

export function createAmmoLedgerPwaIconResponse({ size }: { size: number }) {
  const glyphSize = Math.round(size * 0.38);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: ammoLedgerPwaConfig.themeColor,
      }}
    >
      <div
        style={{
          fontSize: glyphSize,
          color: ammoLedgerPwaConfig.backgroundColor,
          fontWeight: 700,
          fontFamily: "sans-serif",
          lineHeight: 1,
        }}
      >
        弾
      </div>
    </div>,
    { width: size, height: size },
  );
}

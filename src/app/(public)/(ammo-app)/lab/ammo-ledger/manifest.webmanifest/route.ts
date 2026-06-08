import {
  ammoLedgerPwaConfig,
  ammoLedgerPwaIconSizes,
  ammoLedgerPwaIcons,
} from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";

export function GET() {
  const manifest = {
    name: ammoLedgerPwaConfig.name,
    short_name: ammoLedgerPwaConfig.shortName,
    description: ammoLedgerPwaConfig.description,
    start_url: ammoLedgerPwaConfig.startUrl,
    scope: ammoLedgerPwaConfig.scope,
    display: "standalone",
    orientation: "portrait",
    lang: "ja",
    dir: "ltr",
    background_color: ammoLedgerPwaConfig.backgroundColor,
    theme_color: ammoLedgerPwaConfig.themeColor,
    icons: [
      ...ammoLedgerPwaIconSizes.map((size) => ({
        src: ammoLedgerPwaIcons[size],
        sizes: `${size}x${size}`,
        type: "image/png",
        purpose: "any",
      })),
      {
        src: ammoLedgerPwaIcons.maskable512,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}

export const ammoLedgerPwaConfig = {
  name: "実包管理帳簿",
  shortName: "実包帳簿",
  description: "実包の記録・帳簿・残弾管理",
  startUrl: "/lab/ammo-ledger",
  scope: "/lab/ammo-ledger",
  manifestPath: "/lab/ammo-ledger/manifest.webmanifest",
  offlinePath: "/lab/ammo-ledger/~offline",
  backgroundColor: "#FAF9FC",
  themeColor: "#6B3560",
} as const;

export const ammoLedgerPwaIconSizes = [180, 192, 512] as const;

export const ammoLedgerPwaIcons = {
  180: "/icons/ammo-ledger-icon-180.png",
  192: "/icons/ammo-ledger-icon-192.png",
  512: "/icons/ammo-ledger-icon-512.png",
  maskable512: "/icons/ammo-ledger-icon-512-maskable.png",
} as const;

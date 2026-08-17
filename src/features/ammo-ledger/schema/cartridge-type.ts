export const cartridgeTypes = ["rifle", "shotgun_slug", "shotgun_shot"] as const;

export type CartridgeType = (typeof cartridgeTypes)[number];

export const cartridgeTypeLabels: Record<CartridgeType, string> = {
  rifle: "ライフル",
  shotgun_slug: "単弾",
  shotgun_shot: "散弾",
};

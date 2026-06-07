export const shotTypes = ["slug", "shot"] as const;

export type ShotType = (typeof shotTypes)[number];

export const shotTypeLabels: Record<ShotType, string> = {
  slug: "単弾",
  shot: "散弾",
};

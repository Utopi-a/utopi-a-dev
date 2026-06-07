export const catalogKinds = ["range", "gun_shop"] as const;

export type CatalogKind = (typeof catalogKinds)[number];

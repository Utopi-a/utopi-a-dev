export const permitEventKinds = ["grant", "expiry", "carryover"] as const;

export type PermitEventKind = (typeof permitEventKinds)[number];

export const permitEventKindLabels: Record<PermitEventKind, string> = {
  grant: "許可取得",
  expiry: "許可失効",
  carryover: "繰越",
};

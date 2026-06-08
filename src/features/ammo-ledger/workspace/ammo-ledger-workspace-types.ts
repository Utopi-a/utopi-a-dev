import type {
  ammoAcquisitionPermit,
  ammoGun,
  ammoLedgerEntry,
  ammoLedgerProfile,
  ammoPermitEvent,
  ammoType,
} from "@/db/schema/ammo-ledger";

export type AmmoLedgerInventoryItem = {
  ammoType: typeof ammoType.$inferSelect;
  bookStock: number;
};

export type AmmoLedgerWorkspace = {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  profile: typeof ammoLedgerProfile.$inferSelect | null;
  inventoryItems: AmmoLedgerInventoryItem[];
  guns: (typeof ammoGun.$inferSelect)[];
};

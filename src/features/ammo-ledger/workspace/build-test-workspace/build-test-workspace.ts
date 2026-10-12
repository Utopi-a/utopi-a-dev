import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import type { LedgerEntryRow } from "@/features/ammo-ledger/workspace/apply-ledger-entry-changes/apply-ledger-entry-changes";
import { computeInventoryItems } from "@/features/ammo-ledger/workspace/compute-inventory-items/compute-inventory-items";

const createdAt = new Date("2026-01-01T00:00:00Z");

export const testAmmoType = {
  id: "ammo-1",
  userId: "user-1",
  name: "テスト散弾 7.5号",
  caliber: "12番",
  cartridgeType: "shotgun_shot",
  gaugeNumber: "7.5",
  roundsPerBox: 25,
  defaultPurpose: "shooting",
  classificationConfirmedAt: createdAt,
  memo: null,
  createdAt,
  updatedAt: createdAt,
};

export const testGun = {
  id: "gun-1",
  userId: "user-1",
  name: "テスト銃",
  gunNumber: "G-1",
  permitNumber: "P-1",
  gunType: "上下二連",
  caliber: "12番",
  purpose: null,
  memo: null,
  createdAt,
  updatedAt: createdAt,
};

/** テスト用の帳簿行。指定しない項目は射撃用・テスト弾の値にする */
export function buildTestEntry(
  entry: Pick<LedgerEntryRow, "id" | "category" | "occurredOn" | "quantity"> &
    Partial<LedgerEntryRow>,
): LedgerEntryRow {
  return {
    userId: "user-1",
    transactionId: `transaction-${entry.id}`,
    purpose: "shooting",
    ammoTypeId: testAmmoType.id,
    ammoTypeName: testAmmoType.name,
    ammoCartridgeType: testAmmoType.cartridgeType,
    ammoCaliber: testAmmoType.caliber,
    ammoGaugeNumber: testAmmoType.gaugeNumber,
    location: null,
    ledgerNote: null,
    counterpartyName: null,
    counterpartyAddress: null,
    gunId: null,
    gunName: null,
    gunNumber: null,
    gunPermitNumber: null,
    voidedAt: null,
    dayOrder: 0,
    createdAt: new Date(`${entry.occurredOn}T00:00:00Z`),
    updatedAt: new Date(`${entry.occurredOn}T00:00:00Z`),
    ...entry,
  };
}

export function buildTestWorkspace({
  entries = [],
  ...overrides
}: Partial<AmmoLedgerWorkspace> = {}): AmmoLedgerWorkspace {
  return {
    entries,
    permitEvents: [],
    permits: [],
    profile: null,
    lockState: { isLocked: false, lockedThrough: null },
    inventoryItems: computeInventoryItems({ entries, ammoTypes: [testAmmoType] }),
    guns: [testGun],
    ...overrides,
  };
}

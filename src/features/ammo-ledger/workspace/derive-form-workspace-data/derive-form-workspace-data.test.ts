import { describe, expect, it } from "vitest";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { deriveFormWorkspaceData } from "@/features/ammo-ledger/workspace/derive-form-workspace-data/derive-form-workspace-data";

function buildWorkspace({ bookStock = 0 }: { bookStock?: number } = {}): AmmoLedgerWorkspace {
  const ammoType = {
    id: "ammo-1",
    userId: "user-1",
    name: "テスト弾",
    caliber: "12号",
    shotType: "鳥撃",
    gaugeNumber: "12",
    roundsPerBox: 25,
    defaultPurpose: "shooting",
    memo: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return {
    entries: [],
    permitEvents: [],
    permits: [],
    profile: null,
    inventoryItems: [{ ammoType, bookStock }],
    guns: [
      {
        id: "gun-1",
        userId: "user-1",
        name: "テスト銃",
        gunNumber: "12345",
        permitNumber: "67890",
        gunType: "散弾銃",
        caliber: "12番",
        purpose: null,
        memo: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  };
}

describe("deriveFormWorkspaceData", () => {
  it("workspace からフォーム用の銃・弾種・残弾を導出する", () => {
    const result = deriveFormWorkspaceData({ workspace: buildWorkspace({ bookStock: 42 }) });

    expect(result.guns).toHaveLength(1);
    expect(result.ammoTypes).toHaveLength(1);
    expect(result.ammoTypes[0]?.id).toBe("ammo-1");
    expect(result.stockByAmmoTypeId).toEqual({ "ammo-1": 42 });
  });
});

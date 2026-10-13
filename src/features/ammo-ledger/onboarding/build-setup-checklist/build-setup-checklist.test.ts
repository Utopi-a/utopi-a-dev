import { describe, expect, it } from "vitest";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { buildSetupChecklist } from "./build-setup-checklist";

const updatedAt = new Date("2026-01-01T00:00:00Z");

function buildProfile({ ownerAddress }: { ownerAddress: string | null }) {
  return {
    userId: "user-1",
    ownerName: "架空 太郎",
    ownerFurigana: null,
    possessionPermitCertificateNumber: null,
    ownerAddress,
    ownerBirthDate: null,
    ownerPhone: null,
    updatedAt,
  };
}

const permit = {
  id: "permit-1",
  userId: "user-1",
  ledgerPurpose: "shooting",
  name: "許可1",
  permitPurpose: "標的射撃",
  grantedOn: "2026-01-10",
  expiresOn: "2027-01-09",
  quantity: 500,
  memo: null,
  createdAt: updatedAt,
  updatedAt,
};

function statusById(checklist: ReturnType<typeof buildSetupChecklist>) {
  return Object.fromEntries(
    checklist.items.map((item) => [item.id, { requirement: item.requirement, done: item.isDone }]),
  );
}

describe("buildSetupChecklist", () => {
  it("何も登録していない人には、プロフィールから順に必須・推奨・任意の手順を返す", () => {
    const checklist = buildSetupChecklist({
      workspace: buildTestWorkspace({ guns: [], inventoryItems: [] }),
    });

    expect(statusById(checklist)).toEqual({
      profile: { requirement: "required", done: false },
      guns: { requirement: "required", done: false },
      "ammo-types": { requirement: "required", done: false },
      permits: { requirement: "recommended", done: false },
      "opening-balance": { requirement: "optional", done: false },
    });
    expect(checklist.items.map((item) => item.href)).toEqual([
      "/lab/ammo-ledger/settings/profile",
      "/lab/ammo-ledger/settings/guns",
      "/lab/ammo-ledger/settings/ammo-types",
      "/lab/ammo-ledger/settings/permits",
      "/lab/ammo-ledger/settings/opening-balance",
    ]);
    expect(checklist.nextRequiredItemId).toBe("profile");
  });

  it("住所のないプロフィールは未完了とし、次の手順はプロフィールのまま", () => {
    const checklist = buildSetupChecklist({
      workspace: buildTestWorkspace({ profile: buildProfile({ ownerAddress: "  " }) }),
    });

    expect(statusById(checklist).profile.done).toBe(false);
    expect(checklist.nextRequiredItemId).toBe("profile");
  });

  it("プロフィールが済んで銃がないときは、銃を次の手順にする", () => {
    const checklist = buildSetupChecklist({
      workspace: buildTestWorkspace({
        profile: buildProfile({ ownerAddress: "架空県架空市1-1" }),
        guns: [],
      }),
    });

    expect(statusById(checklist).profile.done).toBe(true);
    expect(statusById(checklist)["ammo-types"].done).toBe(true);
    expect(checklist.nextRequiredItemId).toBe("guns");
  });

  it("必須がすべて済めば、許可や繰越が未登録でも次の手順はない", () => {
    const checklist = buildSetupChecklist({
      workspace: buildTestWorkspace({ profile: buildProfile({ ownerAddress: "架空県架空市1-1" }) }),
    });

    expect(statusById(checklist).permits.done).toBe(false);
    expect(statusById(checklist)["opening-balance"].done).toBe(false);
    expect(checklist.nextRequiredItemId).toBeNull();
  });

  it("許可の登録と、実包・許可どちらかの年初繰越で推奨・任意の項目を完了にする", () => {
    const withStockCarryover = buildSetupChecklist({
      workspace: buildTestWorkspace({
        permits: [permit],
        entries: [
          buildTestEntry({
            id: "carryover-1",
            category: "carryover",
            occurredOn: "2026-01-01",
            quantity: 100,
          }),
        ],
      }),
    });
    const withPermitCarryover = buildSetupChecklist({
      workspace: buildTestWorkspace({
        permitEvents: [
          {
            id: "event-1",
            userId: "user-1",
            permitId: null,
            purpose: "shooting",
            eventKind: "carryover",
            occurredOn: "2026-01-01",
            quantity: 300,
            memo: null,
            createdAt: updatedAt,
            updatedAt,
          },
        ],
      }),
    });

    expect(statusById(withStockCarryover).permits.done).toBe(true);
    expect(statusById(withStockCarryover)["opening-balance"].done).toBe(true);
    expect(statusById(withPermitCarryover)["opening-balance"].done).toBe(true);
  });
});

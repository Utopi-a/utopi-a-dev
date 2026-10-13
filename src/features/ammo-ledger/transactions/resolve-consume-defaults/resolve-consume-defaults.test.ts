import { describe, expect, it } from "vitest";
import { buildTestEntry } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { resolveConsumeDefaults } from "./resolve-consume-defaults";

describe("resolveConsumeDefaults", () => {
  it("日付・並び順で最後の消費と同じ銃・弾・用途を初期値にする", () => {
    const result = resolveConsumeDefaults({
      entries: [
        buildTestEntry({
          id: "latest-by-order",
          category: "consume",
          occurredOn: "2026-05-01",
          quantity: 25,
          dayOrder: 2,
          gunId: "gun-b",
          ammoTypeId: "ammo-b",
          purpose: "hunting",
          location: "テスト猟区",
        }),
        buildTestEntry({
          id: "earlier",
          category: "consume",
          occurredOn: "2026-05-01",
          quantity: 25,
          dayOrder: 1,
          gunId: "gun-a",
          ammoTypeId: "ammo-a",
        }),
        buildTestEntry({
          id: "acquire",
          category: "acquire",
          occurredOn: "2026-06-01",
          quantity: 50,
        }),
      ],
      gunIds: ["gun-a", "gun-b"],
      ammoTypes: [
        { id: "ammo-a", defaultPurpose: "shooting" },
        { id: "ammo-b", defaultPurpose: "shooting" },
      ],
    });

    expect(result).toEqual({
      gunId: "gun-b",
      ammoTypeId: "ammo-b",
      purpose: "hunting",
      location: "テスト猟区",
      fromPreviousEntry: true,
    });
  });

  it("前回の銃・弾が削除済みなら、登録が1件だけのものを選び、複数なら選ばない", () => {
    const result = resolveConsumeDefaults({
      entries: [
        buildTestEntry({
          id: "deleted-masters",
          category: "consume",
          occurredOn: "2026-05-01",
          quantity: 25,
          gunId: "deleted-gun",
          ammoTypeId: "deleted-ammo",
        }),
      ],
      gunIds: ["only-gun"],
      ammoTypes: [
        { id: "ammo-a", defaultPurpose: "shooting" },
        { id: "ammo-b", defaultPurpose: "shooting" },
      ],
    });

    expect(result).toEqual({
      gunId: "only-gun",
      ammoTypeId: undefined,
      purpose: "shooting",
      location: undefined,
      fromPreviousEntry: false,
    });
  });

  it("消費記録がなく弾が複数なら、弾も用途も決めない", () => {
    expect(
      resolveConsumeDefaults({
        entries: [],
        gunIds: ["gun-a", "gun-b"],
        ammoTypes: [
          { id: "ammo-a", defaultPurpose: "shooting" },
          { id: "ammo-b", defaultPurpose: "hunting" },
        ],
      }),
    ).toEqual({
      gunId: undefined,
      ammoTypeId: undefined,
      purpose: undefined,
      location: undefined,
      fromPreviousEntry: false,
    });
  });

  it("消費記録がなく弾が1件だけなら、その弾の既定用途を初期値にする", () => {
    expect(
      resolveConsumeDefaults({
        entries: [],
        gunIds: ["gun-a"],
        ammoTypes: [{ id: "ammo-hunting", defaultPurpose: "hunting" }],
      }),
    ).toEqual({
      gunId: "gun-a",
      ammoTypeId: "ammo-hunting",
      purpose: "hunting",
      location: undefined,
      fromPreviousEntry: false,
    });
  });
});

import { describe, expect, it } from "vitest";
import { buildTestEntry } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { resolveAmmoTypeDefaults } from "./resolve-ammo-type-defaults";

const ammoTypes = [
  { id: "ammo-a", defaultPurpose: "shooting" },
  { id: "ammo-b", defaultPurpose: "hunting" },
];

describe("resolveAmmoTypeDefaults", () => {
  it("同じ区分の直前の記録と同じ弾・用途にし、ほかの区分の記録は見ない", () => {
    const result = resolveAmmoTypeDefaults({
      entries: [
        buildTestEntry({
          id: "dispose",
          category: "dispose",
          occurredOn: "2026-05-01",
          quantity: 10,
          ammoTypeId: "ammo-b",
          purpose: "pest_control",
        }),
        buildTestEntry({
          id: "later-acquire",
          category: "acquire",
          occurredOn: "2026-06-01",
          quantity: 50,
          ammoTypeId: "ammo-a",
        }),
      ],
      category: "dispose",
      ammoTypes,
    });

    expect(result).toMatchObject({
      ammoTypeId: "ammo-b",
      purpose: "pest_control",
      isAmmoTypeFromPrevious: true,
    });
  });

  it("同じ区分の記録がなく、弾の登録が1件だけなら、その弾と既定用途を選ぶ", () => {
    expect(
      resolveAmmoTypeDefaults({
        entries: [],
        category: "transfer",
        ammoTypes: [{ id: "ammo-b", defaultPurpose: "hunting" }],
      }),
    ).toMatchObject({ ammoTypeId: "ammo-b", purpose: "hunting", isAmmoTypeFromPrevious: false });
  });

  it("同じ区分の記録がなく、弾が複数あれば選ばない", () => {
    expect(resolveAmmoTypeDefaults({ entries: [], category: "issue", ammoTypes })).toMatchObject({
      ammoTypeId: undefined,
      purpose: undefined,
    });
  });
});

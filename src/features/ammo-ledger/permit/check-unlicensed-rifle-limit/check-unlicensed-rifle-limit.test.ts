import { describe, expect, it } from "vitest";
import { checkUnlicensedRifleLimit } from "./check-unlicensed-rifle-limit";

const huntingQuota = {
  kind: "unlicensed",
  ledgerPurpose: "hunting",
  grantedOn: "2026-10-15",
  expiresOn: "2027-04-15",
};

function rifleAcquire({
  id,
  occurredOn,
  quantity,
}: {
  id: string;
  occurredOn: string;
  quantity: number;
}) {
  return {
    id,
    purpose: "hunting",
    category: "acquire",
    occurredOn,
    quantity,
    ammoCartridgeType: "rifle",
  };
}

describe("checkUnlicensedRifleLimit", () => {
  it("枠の期間中に無許可で譲り受けたライフル実包を数え、この記録を足した数を返す", () => {
    expect(
      checkUnlicensedRifleLimit({
        permits: [huntingQuota],
        entries: [
          rifleAcquire({ id: "a", occurredOn: "2026-11-01", quantity: 40 }),
          // 枠の期間前の譲受は数えない
          rifleAcquire({ id: "b", occurredOn: "2026-10-01", quantity: 20 }),
          {
            ...rifleAcquire({ id: "c", occurredOn: "2026-11-02", quantity: 25 }),
            ammoCartridgeType: "shotgun_slug",
          },
        ],
        purpose: "hunting",
        occurredOn: "2026-11-20",
        cartridgeType: "rifle",
        rounds: 20,
      }),
    ).toEqual({ usedRounds: 40, roundsAfterEntry: 60, limit: 50 });
  });

  it("編集中の記録は数え直さない", () => {
    expect(
      checkUnlicensedRifleLimit({
        permits: [huntingQuota],
        entries: [rifleAcquire({ id: "a", occurredOn: "2026-11-01", quantity: 40 })],
        purpose: "hunting",
        occurredOn: "2026-11-01",
        cartridgeType: "rifle",
        rounds: 30,
        excludedEntryId: "a",
      })?.roundsAfterEntry,
    ).toBe(30);
  });

  it("譲受許可も使える日の譲受は、許可で譲り受けた可能性があるので数えない", () => {
    const rifleUsage = checkUnlicensedRifleLimit({
      permits: [
        huntingQuota,
        {
          kind: "permit",
          ledgerPurpose: "hunting",
          grantedOn: "2026-10-01",
          expiresOn: "2026-10-31",
        },
      ],
      entries: [rifleAcquire({ id: "a", occurredOn: "2026-10-20", quantity: 40 })],
      purpose: "hunting",
      occurredOn: "2026-11-20",
      cartridgeType: "rifle",
      rounds: 20,
    });
    expect(rifleUsage?.usedRounds).toBe(0);
  });

  it("この記録の日に譲受許可があれば上限を見ない", () => {
    expect(
      checkUnlicensedRifleLimit({
        permits: [
          huntingQuota,
          {
            kind: "permit",
            ledgerPurpose: "hunting",
            grantedOn: "2026-11-01",
            expiresOn: "2027-10-31",
          },
        ],
        entries: [],
        purpose: "hunting",
        occurredOn: "2026-11-20",
        cartridgeType: "rifle",
        rounds: 100,
      }),
    ).toBeNull();
  });

  it("ライフル実包でなければ上限を見ない", () => {
    expect(
      checkUnlicensedRifleLimit({
        permits: [huntingQuota],
        entries: [],
        purpose: "hunting",
        occurredOn: "2026-11-20",
        cartridgeType: "shotgun_shot",
        rounds: 100,
      }),
    ).toBeNull();
  });

  it("用途の違う枠は使わない", () => {
    expect(
      checkUnlicensedRifleLimit({
        permits: [huntingQuota],
        entries: [],
        purpose: "pest_control",
        occurredOn: "2026-11-20",
        cartridgeType: "rifle",
        rounds: 100,
      }),
    ).toBeNull();
  });
});

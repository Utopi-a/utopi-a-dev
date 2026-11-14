import { describe, expect, it } from "vitest";
import { unlicensedAcquisitionQuotaInputSchema } from "./unlicensed-acquisition-quota-schema";

describe("unlicensedAcquisitionQuotaInputSchema", () => {
  it("狩猟用・有害鳥獣駆除用の期間を受け付ける", () => {
    for (const ledgerPurpose of ["hunting", "pest_control"]) {
      expect(
        unlicensedAcquisitionQuotaInputSchema.safeParse({
          ledgerPurpose,
          startsOn: "2026-10-15",
          endsOn: "2027-04-15",
        }).success,
      ).toBe(true);
    }
  });

  it("射撃用は無許可譲受の対象外なので受け付けない", () => {
    expect(
      unlicensedAcquisitionQuotaInputSchema.safeParse({
        ledgerPurpose: "shooting",
        startsOn: "2026-10-15",
        endsOn: "2027-04-15",
      }).success,
    ).toBe(false);
  });

  it("終わりが始まりより前の期間は受け付けない", () => {
    expect(
      unlicensedAcquisitionQuotaInputSchema.safeParse({
        ledgerPurpose: "hunting",
        startsOn: "2027-04-16",
        endsOn: "2027-04-15",
      }).success,
    ).toBe(false);
  });
});

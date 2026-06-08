import { describe, expect, it } from "vitest";
import { buildGunPermitFieldValues } from "./build-field-values";

describe("buildGunPermitFieldValues", () => {
  it("申請者情報と別紙銃情報をフィールド値に変換する", () => {
    const result = buildGunPermitFieldValues({
      input: {
        kind: "new",
        prefectureName: "北海道",
        applicationDate: "2026-06-09",
        ownerName: "山田太郎",
        ownerAddress: "札幌市中央区",
        ownerBirthDate: "1980-01-15",
        applicationCount: 1,
        guns: [
          {
            gunCategory: "shotgun",
            gunType: "散弾銃",
            model: "単身ボルト式",
            gunNumber: "12345",
            purpose: "hunting",
            caliber: "12番",
          },
        ],
        hasExistingPermit: false,
        existingPermitSubmittedToSamePrefecture: false,
        issuesNewPermitCard: true,
        isAge75OrOlder: false,
        hasCohabitants: false,
        pledgeDisqualification: true,
      },
    });

    expect(result.mainFields.prefectureName).toBe("北海道");
    expect(result.mainFields.ownerName).toBe("山田太郎");
    expect(result.mainFields.applicationDateYear).toBe("2026");
    expect(result.supplementGunPages).toHaveLength(1);
    expect(result.supplementGunPages[0]?.frontFields.gunNumber).toBe("12345");
    expect(result.supplementGunPages[0]?.frontFields.purposeHunting).toBe("✓");
  });
});

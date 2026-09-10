import { describe, expect, it } from "vitest";
import type { AcquisitionPermitApplicationInput } from "../acquisition-permit-application-types";
import { buildApplicationFieldValues } from "./build-application-field-values";

const input: AcquisitionPermitApplicationInput = {
  prefectureName: "茨城県",
  applicationDate: "2026-09-10",
  ownerName: "テスト氏名",
  ownerAddress: "テスト住所",
  ammoName: "12番",
  requestedQuantity: 500,
  currentHomeStock: 755,
  permitPurpose: "標的射撃",
  ledgerPurpose: "shooting",
  validFrom: "2026-09-10",
  validTo: "2027-09-09",
  storageLocation: "自宅装弾ロッカー",
  counterpartyName: "テスト銃砲店",
  counterpartyAddress: "テスト所在地",
  consumptionPlan: {
    rows: [],
    warnings: [],
    peakHomeStock: 755,
    totalAcquisition: 500,
    totalConsumption: 500,
  },
};

describe("buildApplicationFieldValues", () => {
  it("銃ごとの許可番号ではなく、入力した所持許可証番号を印刷する", () => {
    const values = buildApplicationFieldValues({
      input: { ...input, possessionPermitCertificateNumber: "00123456789" },
    });
    expect(values.mainFields.permitCertificateNumber).toBe("00123456789");
    expect(values.mainFields.certificateTypeGunPossessionPermit).toBe("✓");
  });

  it("古い画面で保存された銃ごとの番号を許可証番号として流用しない", () => {
    const legacyInput = { ...input, gunPermitNumber: "銃ごとの番号12345" };
    const values = buildApplicationFieldValues({ input: legacyInput });
    expect(values.mainFields.permitCertificateNumber).toBe("");
    expect(values.mainFields.certificateTypeGunPossessionPermit).toBe("");
  });

  it("印刷済みの第・号は重ねず、番号の先頭ゼロと区切りを維持する", () => {
    const values = buildApplicationFieldValues({
      input: { ...input, possessionPermitCertificateNumber: " 第 001-234 号 " },
    });
    expect(values.mainFields.permitCertificateNumber).toBe("001-234");
  });

  it.each(["上旬", "中旬", "下旬"] as const)("別紙の%sは旬を重複させず1文字にする", (period) => {
    const values = buildApplicationFieldValues({
      input: {
        ...input,
        consumptionPlan: {
          ...input.consumptionPlan,
          rows: [
            {
              rowIndex: 1,
              scheduledPeriod: { year: 2026, month: 9, period },
              locationName: "テスト射撃場",
              locationAddress: "テスト所在地",
              purpose: "標的射撃",
              consumptionQuantity: 500,
              acquisitionQuantity: 0,
              isAcquisition: false,
            },
          ],
        },
      },
    });
    expect(values.supplementRows[0].values.period).toBe(period[0]);
  });
});

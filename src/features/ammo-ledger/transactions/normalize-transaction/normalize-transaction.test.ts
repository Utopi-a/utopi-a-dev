import { describe, expect, it } from "vitest";
import { normalizeTransaction } from "./normalize-transaction";

describe("normalizeTransaction", () => {
  it("消費入力を法定行に正規化する", () => {
    const result = normalizeTransaction({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      ammoTypeName: "12番 散弾",
      boxCount: 3,
      looseRounds: -2,
      roundsPerBox: 25,
      gunId: "gun-1",
      gunName: "DT11",
      gunPermitNumber: "12345",
      rangeId: "range-1",
      rangeName: "成田射撃場",
      rangeAddress: "千葉県成田市",
    });

    expect(result).toEqual({
      category: "consume",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      ammoTypeName: "12番 散弾",
      quantity: 73,
      location: "成田射撃場 千葉県成田市",
      counterpartyName: null,
      counterpartyAddress: null,
      gunId: "gun-1",
      gunName: "DT11",
      gunPermitNumber: "12345",
    });
  });

  it("譲受入力を法定行に正規化する", () => {
    const result = normalizeTransaction({
      inputKind: "acquire",
      occurredOn: "2026-06-01",
      ammoTypeId: "ammo-1",
      ammoTypeName: "12番 散弾",
      boxCount: 10,
      looseRounds: 0,
      roundsPerBox: 25,
      counterpartyName: "○○商店",
      counterpartyAddress: "東京都千代田区",
    });

    expect(result).toEqual({
      category: "acquire",
      occurredOn: "2026-06-01",
      ammoTypeId: "ammo-1",
      ammoTypeName: "12番 散弾",
      quantity: 250,
      location: null,
      counterpartyName: "○○商店",
      counterpartyAddress: "東京都千代田区",
      gunId: null,
      gunName: null,
      gunPermitNumber: null,
    });
  });

  it("数量が0以下なら null を返す", () => {
    const result = normalizeTransaction({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      ammoTypeName: "12番 散弾",
      boxCount: 0,
      looseRounds: 0,
      roundsPerBox: 25,
      gunId: "gun-1",
      gunName: "DT11",
      gunPermitNumber: "12345",
      rangeId: "range-1",
      rangeName: "成田射撃場",
      rangeAddress: "千葉県成田市",
    });

    expect(result).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { formatLedgerGunLabel } from "@/features/ammo-ledger/ledger/format-ledger-gun-label/format-ledger-gun-label";

describe("formatLedgerGunLabel", () => {
  it("銃名に銃番号と許可番号を付ける", () => {
    expect(
      formatLedgerGunLabel({
        gunName: "ベレッタ",
        gunNumber: "7654321",
        gunPermitNumber: "12345",
      }),
    ).toBe("ベレッタ（7654321 / 12345）");
  });

  it("許可番号だけあるときは許可番号のみ付ける", () => {
    expect(
      formatLedgerGunLabel({
        gunName: "ベレッタ",
        gunPermitNumber: "12345",
      }),
    ).toBe("ベレッタ（12345）");
  });

  it("銃名がないときは空文字を返す", () => {
    expect(
      formatLedgerGunLabel({
        gunName: null,
        gunPermitNumber: "12345",
      }),
    ).toBe("");
  });
});

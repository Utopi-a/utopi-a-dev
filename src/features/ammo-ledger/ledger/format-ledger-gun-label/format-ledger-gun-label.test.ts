import { describe, expect, it } from "vitest";
import { formatLedgerGunLabel } from "@/features/ammo-ledger/ledger/format-ledger-gun-label/format-ledger-gun-label";

describe("formatLedgerGunLabel", () => {
  it("銃名に許可番号を付ける", () => {
    expect(
      formatLedgerGunLabel({
        gunName: "ベレッタ",
        gunPermitNumber: "12345",
      }),
    ).toBe("ベレッタ（12345）");
  });

  it("銃名がなくても許可番号を表示する", () => {
    expect(
      formatLedgerGunLabel({
        gunName: null,
        gunPermitNumber: "12345",
      }),
    ).toBe("12345");
  });

  it("許可番号がないときは銃番号を表示する", () => {
    expect(
      formatLedgerGunLabel({
        gunName: "ベレッタ",
        gunPermitNumber: null,
        gunNumber: "G-001",
      }),
    ).toBe("ベレッタ（G-001）");
  });
});

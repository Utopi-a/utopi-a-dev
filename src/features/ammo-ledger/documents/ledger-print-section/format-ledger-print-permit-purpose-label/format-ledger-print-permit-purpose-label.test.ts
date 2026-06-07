import { describe, expect, it } from "vitest";
import { formatLedgerPrintPermitPurposeLabel } from "./format-ledger-print-permit-purpose-label";

describe("formatLedgerPrintPermitPurposeLabel", () => {
  it("狩猟目的は印刷表記を短くする", () => {
    expect(formatLedgerPrintPermitPurposeLabel({ permitPurpose: "狩猟（鳥獣の捕獲）" })).toBe(
      "狩猟",
    );
  });
});

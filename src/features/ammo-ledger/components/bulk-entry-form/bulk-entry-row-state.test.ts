import { describe, expect, it } from "vitest";
import {
  buildBulkEntryPayload,
  copyBulkEntryField,
  createBulkEntryRow,
  hasBulkEntryPackaging,
} from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-state";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

describe("bulk-entry-row-state", () => {
  it("builds consume payload only when packaging exists", () => {
    const row = createBulkEntryRow({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      defaultCounterpartyId: manualCounterpartyId,
    });

    expect(buildBulkEntryPayload({ row })).toBeNull();

    const filled = {
      ...row,
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      boxCount: "2",
    };

    expect(buildBulkEntryPayload({ row: filled })).toEqual({
      inputKind: "consume",
      purpose: "shooting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      outerBoxCount: 0,
      boxCount: 2,
      looseRounds: 0,
    });
  });

  it("copies selected fields from the row above", () => {
    const source = {
      ...createBulkEntryRow({
        inputKind: "acquire",
        occurredOn: "2026-06-01",
        defaultCounterpartyId: "shop-1",
      }),
      purpose: "hunting" as const,
      ammoTypeId: "ammo-2",
      counterpartyName: "テスト店",
      counterpartyAddress: "東京都",
    };
    const target = createBulkEntryRow({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      defaultCounterpartyId: manualCounterpartyId,
    });

    const copied = copyBulkEntryField({
      source,
      target,
      field: "counterparty",
    });

    expect(copied.counterpartyId).toBe("shop-1");
    expect(copied.counterpartyName).toBe("テスト店");
    expect(hasBulkEntryPackaging({ row: copied })).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  applyAmmoTypeToRow,
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

  it("builds hunting consume payload with readable location", () => {
    const row = {
      ...createBulkEntryRow({
        inputKind: "consume",
        occurredOn: "2026-06-07",
        defaultCounterpartyId: manualCounterpartyId,
      }),
      purpose: "hunting" as const,
      locationInputKind: "manual" as const,
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      location: "千葉県○○猟場",
      looseRounds: "5",
    };

    expect(buildBulkEntryPayload({ row })).toEqual({
      inputKind: "consume",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      location: "千葉県○○猟場",
      outerBoxCount: 0,
      boxCount: 0,
      looseRounds: 5,
    });
  });

  it("builds hunting consume payload with a shooting range", () => {
    const row = {
      ...createBulkEntryRow({
        inputKind: "consume",
        occurredOn: "2026-06-07",
        defaultCounterpartyId: manualCounterpartyId,
      }),
      purpose: "hunting" as const,
      locationInputKind: "range" as const,
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      looseRounds: "5",
    };

    expect(buildBulkEntryPayload({ row })).toEqual({
      inputKind: "consume",
      purpose: "hunting",
      occurredOn: "2026-06-07",
      ammoTypeId: "ammo-1",
      gunId: "gun-1",
      rangeId: "range-1",
      outerBoxCount: 0,
      boxCount: 0,
      looseRounds: 5,
    });
  });

  it("keeps a selected range when changing between hunting ammo types", () => {
    const row = {
      ...createBulkEntryRow({
        inputKind: "consume",
        occurredOn: "2026-06-07",
        defaultCounterpartyId: manualCounterpartyId,
      }),
      purpose: "hunting" as const,
      locationInputKind: "range" as const,
      rangeId: "range-1",
    };
    const createdAt = new Date("2026-01-01T00:00:00.000Z");

    const result = applyAmmoTypeToRow({
      row,
      ammoTypeId: "ammo-2",
      ammoTypes: [
        {
          id: "ammo-2",
          userId: "user-1",
          name: "別の狩猟用の弾",
          caliber: "12番",
          cartridgeType: "shotgun_shot",
          classificationConfirmedAt: createdAt,
          gaugeNumber: "6号",
          roundsPerBox: 25,
          defaultPurpose: "hunting",
          memo: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    expect(result.purpose).toBe("hunting");
    expect(result.locationInputKind).toBe("range");
    expect(result.rangeId).toBe("range-1");
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
      location: "東京都猟場",
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

  it("copies consume place fields from the row above", () => {
    const source = {
      ...createBulkEntryRow({
        inputKind: "consume",
        occurredOn: "2026-06-01",
        defaultCounterpartyId: manualCounterpartyId,
      }),
      purpose: "pest_control" as const,
      locationInputKind: "range" as const,
      rangeId: "range-1",
      location: "千葉県△△駆除場所",
    };
    const target = createBulkEntryRow({
      inputKind: "consume",
      occurredOn: "2026-06-07",
      defaultCounterpartyId: manualCounterpartyId,
    });

    const copied = copyBulkEntryField({
      source,
      target,
      field: "consumeLocation",
    });

    expect(copied.locationInputKind).toBe("range");
    expect(copied.rangeId).toBe("range-1");
    expect(copied.location).toBe("千葉県△△駆除場所");
  });
});

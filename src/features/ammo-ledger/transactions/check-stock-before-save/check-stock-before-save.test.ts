import { describe, expect, it } from "vitest";
import {
  type PlannedStockChange,
  validateStockTimeline,
} from "@/features/ammo-ledger/transactions/check-stock-before-save/check-stock-before-save";

function buildEntry({
  category,
  quantity,
  occurredOn,
  dayOrder,
  purpose = "hunting",
  id = `${occurredOn}-${dayOrder}-${category}`,
  createdAt = new Date("2026-01-01T00:00:00.000Z"),
}: Pick<PlannedStockChange, "category" | "quantity" | "occurredOn" | "dayOrder"> & {
  purpose?: string;
  id?: string;
  createdAt?: Date;
}): PlannedStockChange {
  return {
    id,
    ammoTypeId: "ammo-1",
    ammoTypeName: "12番・散弾",
    purpose,
    category,
    quantity,
    occurredOn,
    dayOrder,
    createdAt,
  };
}

describe("validateStockTimeline", () => {
  it("在庫と同数の出庫を許可する", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 50,
          occurredOn: "2026-01-01",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
      ],
    });

    expect(result).toEqual({ ok: true });
  });

  it("在庫を超える出庫をエラーにする", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 40,
          occurredOn: "2026-01-01",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り40発、出庫50発）",
    });
  });

  it("一括出庫の合計が在庫を超える場合はエラーにする", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 80,
          occurredOn: "2026-01-01",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 40,
          occurredOn: "2026-01-02",
          dayOrder: 1,
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り30発、出庫40発）",
    });
  });

  it("同じ一括登録内の入庫を後続の出庫に反映する", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 1,
        }),
      ],
    });

    expect(result).toEqual({ ok: true });
  });

  it("未来の入庫を過去の出庫に充当できない", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 50,
          occurredOn: "2026-01-03",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 50,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り0発、出庫50発）",
    });
  });

  it("入庫の減額後に既存出庫で負在庫になる場合はエラーにする", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 5,
          occurredOn: "2026-01-01",
          dayOrder: 0,
        }),
        buildEntry({
          category: "consume",
          quantity: 10,
          occurredOn: "2026-01-02",
          dayOrder: 0,
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り5発、出庫10発）",
    });
  });

  it("用途が異なる在庫を出庫に充当できない", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 50,
          occurredOn: "2026-01-01",
          dayOrder: 0,
          purpose: "shooting",
        }),
        buildEntry({
          category: "consume",
          quantity: 1,
          occurredOn: "2026-01-02",
          dayOrder: 0,
          purpose: "hunting",
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り0発、出庫1発）",
    });
  });

  it("同日・同じ並び順では作成日時が古い出庫を先に検査する", () => {
    const result = validateStockTimeline({
      entries: [
        buildEntry({
          category: "acquire",
          quantity: 10,
          occurredOn: "2026-01-02",
          dayOrder: 0,
          createdAt: new Date("2026-01-02T10:00:00.000Z"),
        }),
        buildEntry({
          category: "consume",
          quantity: 10,
          occurredOn: "2026-01-02",
          dayOrder: 0,
          createdAt: new Date("2026-01-02T09:00:00.000Z"),
        }),
      ],
    });

    expect(result).toEqual({
      ok: false,
      error: "12番・散弾の在庫が不足しています（残り0発、出庫10発）",
    });
  });
});

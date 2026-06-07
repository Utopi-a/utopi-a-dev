import { describe, expect, it } from "vitest";
import { evaluateHomeStorageLimit } from "./compute-running-home-stock";

describe("evaluateHomeStorageLimit", () => {
  it("譲受と消費から自宅保管の推移を評価する", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        { id: "e1", occurredOn: "2026-01-01", category: "acquire", quantity: 500 },
        { id: "e2", occurredOn: "2026-02-01", category: "acquire", quantity: 400 },
        { id: "e3", occurredOn: "2026-03-01", category: "consume", quantity: 200 },
      ],
    });

    expect(result.peakStock).toBe(900);
    expect(result.hasExceededBefore).toBe(true);
    expect(result.currentStock).toBe(700);
    expect(result.isCurrentlyExceeded).toBe(false);
    expect(result.exceededEntryIds).toEqual(["e2"]);
  });

  it("800発以下なら警告対象にならない", () => {
    const result = evaluateHomeStorageLimit({
      entries: [
        { id: "e1", occurredOn: "2026-01-01", category: "acquire", quantity: 800 },
        { id: "e2", occurredOn: "2026-02-01", category: "consume", quantity: 300 },
      ],
    });

    expect(result.hasExceededBefore).toBe(false);
    expect(result.currentStock).toBe(500);
  });
});

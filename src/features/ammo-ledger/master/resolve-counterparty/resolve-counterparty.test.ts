import { describe, expect, it } from "vitest";
import { resolveCounterparty } from "./resolve-counterparty";

describe("resolveCounterparty", () => {
  it("マスタ選択時はマスタの氏名住所を使う", () => {
    expect(
      resolveCounterparty({
        counterpartyId: "shop-1",
        master: { id: "shop-1", name: "○○銃砲店", address: "東京都" },
      }),
    ).toEqual({
      name: "○○銃砲店",
      address: "東京都",
      counterpartyId: "shop-1",
    });
  });

  it("手入力時は入力値を使う", () => {
    expect(
      resolveCounterparty({
        counterpartyName: "山田太郎",
        counterpartyAddress: "茨城県",
      }),
    ).toEqual({
      name: "山田太郎",
      address: "茨城県",
      counterpartyId: null,
    });
  });
});

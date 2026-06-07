import { describe, expect, it } from "vitest";
import { validateDraftFromDiff } from "./validate-draft-from-diff";

describe("validateDraftFromDiff", () => {
  it("帳簿より少ない差分では消費・廃棄・譲渡のみ許可する", () => {
    expect(
      validateDraftFromDiff({
        bookStock: 300,
        actualStock: 225,
        inputKind: "consume",
        quantity: 75,
      }),
    ).toEqual({ valid: true });

    expect(
      validateDraftFromDiff({
        bookStock: 300,
        actualStock: 225,
        inputKind: "acquire",
        quantity: 75,
      }),
    ).toEqual({
      valid: false,
      error: "実在庫が帳簿より少ない場合、譲受の下書きは作成できません",
    });
  });

  it("帳簿より多い差分では譲受のみ許可する", () => {
    expect(
      validateDraftFromDiff({
        bookStock: 200,
        actualStock: 250,
        inputKind: "acquire",
        quantity: 50,
      }),
    ).toEqual({ valid: true });

    expect(
      validateDraftFromDiff({
        bookStock: 200,
        actualStock: 250,
        inputKind: "consume",
        quantity: 50,
      }),
    ).toEqual({
      valid: false,
      error: "実在庫が帳簿より多い場合、消費の下書きは作成できません",
    });
  });

  it("数量が差分と一致しなければ拒否する", () => {
    expect(
      validateDraftFromDiff({
        bookStock: 300,
        actualStock: 225,
        inputKind: "consume",
        quantity: 50,
      }),
    ).toEqual({
      valid: false,
      error: "下書き数量は差分と一致している必要があります",
    });
  });

  it("差分が0なら拒否する", () => {
    expect(
      validateDraftFromDiff({
        bookStock: 100,
        actualStock: 100,
        inputKind: "consume",
        quantity: 0,
      }),
    ).toEqual({
      valid: false,
      error: "差分がありません",
    });
  });
});

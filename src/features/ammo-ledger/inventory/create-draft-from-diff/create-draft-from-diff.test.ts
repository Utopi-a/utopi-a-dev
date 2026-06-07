import { describe, expect, it } from "vitest";
import { createDraftSuggestionsFromDiff } from "./create-draft-from-diff";

describe("createDraftSuggestionsFromDiff", () => {
  it("帳簿より実在庫が少ない場合、消費下書き候補を出す", () => {
    const result = createDraftSuggestionsFromDiff({
      bookStock: 327,
      actualStock: 302,
      roundsPerBox: 25,
    });

    expect(result.diff).toBe(-25);
    expect(result.suggestions).toContainEqual({
      inputKind: "consume",
      quantity: 25,
      label: "1箱分の消費記録を作成",
      boxCount: 1,
    });
    expect(result.suggestions).toContainEqual({
      inputKind: "consume",
      quantity: 25,
      label: "25発の消費記録を作成",
    });
    expect(result.suggestions).toContainEqual({
      inputKind: "dispose",
      quantity: 25,
      label: "25発の廃棄記録を作成",
    });
  });

  it("帳簿より実在庫が多い場合、譲受下書き候補を出す", () => {
    const result = createDraftSuggestionsFromDiff({
      bookStock: 200,
      actualStock: 250,
      roundsPerBox: 25,
    });

    expect(result.diff).toBe(50);
    expect(result.suggestions[0]).toEqual({
      inputKind: "acquire",
      quantity: 50,
      label: "50発の譲受記録を作成",
    });
  });

  it("差分が0なら候補なし", () => {
    const result = createDraftSuggestionsFromDiff({
      bookStock: 100,
      actualStock: 100,
      roundsPerBox: 25,
    });

    expect(result.diff).toBe(0);
    expect(result.suggestions).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import {
  resolveSupplementRowLocationFields,
  resolveSupplementRowMemoFields,
} from "./resolve-supplement-row-field-values";

describe("resolveSupplementRowMemoFields", () => {
  it("購入行では備考チェックを付けない", () => {
    expect(resolveSupplementRowMemoFields({ purpose: "標的射撃", isAcquisition: true })).toEqual({
      memoTargetShooting: "",
      memoHunting: "",
      memoOther: "",
      memoOtherText: "",
    });
  });

  it("標的射撃は標的射撃欄にチェック", () => {
    expect(
      resolveSupplementRowMemoFields({ purpose: "標的射撃", isAcquisition: false }),
    ).toMatchObject({
      memoTargetShooting: "✓",
      memoHunting: "",
      memoOther: "",
    });
  });

  it("狩猟目的は狩猟・有害欄にチェック", () => {
    expect(
      resolveSupplementRowMemoFields({
        purpose: "狩猟（鳥獣の捕獲）",
        isAcquisition: false,
      }),
    ).toMatchObject({
      memoTargetShooting: "",
      memoHunting: "✓",
    });
  });

  it("その他以外の特殊目的はその他欄にチェックし文言を入れる", () => {
    expect(resolveSupplementRowMemoFields({ purpose: "実験・研究", isAcquisition: false })).toEqual(
      {
        memoTargetShooting: "",
        memoHunting: "",
        memoOther: "✓",
        memoOtherText: "実験・研究",
      },
    );
  });
});

describe("resolveSupplementRowLocationFields", () => {
  it("購入行は譲受店名のみ", () => {
    expect(
      resolveSupplementRowLocationFields({
        isAcquisition: true,
        locationName: "〇〇商店",
        locationAddress: "茨城県つくば市",
      }),
    ).toEqual({
      locationCounterparty: "〇〇商店",
      locationRangeName: "",
      locationRangeAddress: "",
    });
  });

  it("消費行は射撃場名と場所", () => {
    expect(
      resolveSupplementRowLocationFields({
        isAcquisition: false,
        locationName: "A射撃場",
        locationAddress: "茨城県つくば市",
      }),
    ).toEqual({
      locationCounterparty: "",
      locationRangeName: "A射撃場",
      locationRangeAddress: "茨城県つくば市",
    });
  });
});

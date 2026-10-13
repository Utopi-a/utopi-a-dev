import { describe, expect, it } from "vitest";
import { resolveSubmissionPrefecture } from "./resolve-submission-prefecture";

describe("resolveSubmissionPrefecture", () => {
  it.each([
    ["北海道札幌市中央区北1条西2丁目", "北海道"],
    ["東京都千代田区丸の内1-1", "東京都"],
    ["京都府京都市上京区", "京都府"],
    [" 神奈川県横浜市中区 ", "神奈川県"],
  ])("住所「%s」から提出先を %s にする", (ownerAddress, expected) => {
    expect(resolveSubmissionPrefecture({ ownerAddress })).toBe(expected);
  });

  it.each([
    "",
    "つくば市研究学園1-1",
  ])("都道府県が読み取れない住所「%s」は茨城県のままにする", (ownerAddress) => {
    expect(resolveSubmissionPrefecture({ ownerAddress })).toBe("茨城県");
  });
});

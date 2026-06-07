import { describe, expect, it } from "vitest";
import { pickBestAddress } from "./extract-addresses-from-text";

const NORTHMAN_HTML = `
〒041-0803<br>
北海道函館市亀田中野町219-2<br>
TEL 0138-47-2611
`;

const YAHOO_SNIPPET = `
豊滝クレー射撃場 ( とよたきくれーしやげきじよう ).
化学/ゴム/プラスチック・北海道札幌市南区豊滝517.
電話: 0115962281; 郵便番号: 061-2273
`;

describe("pickBestAddress", () => {
  it("公式サイトHTMLから住所を抽出する", () => {
    const result = pickBestAddress({
      text: NORTHMAN_HTML,
      location: "函館市亀田中野町",
      name: "ﾉｰｽﾏﾝ室内ﾗｲﾌﾙ",
      phone: "0138-47-2611",
    });

    expect(result?.address).toBe("北海道函館市亀田中野町219-2");
  });

  it("Yahoo検索結果から電話番号付き住所を抽出する", () => {
    const result = pickBestAddress({
      text: YAHOO_SNIPPET,
      location: "札幌市南区",
      name: "豊滝クレー",
      phone: "011-596-2281",
    });

    expect(result?.address).toBe("北海道札幌市南区豊滝517");
  });
});

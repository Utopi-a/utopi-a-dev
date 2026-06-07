import { describe, expect, it } from "vitest";
import { parseSportsgunHtml } from "./parse-sportsgun-html";

const SAMPLE_HTML = `
<div class="shopList">
  <ul>
    <li>
      <div class="shopInfo">
        <h3 class="shopListName">仙台綜合射撃場</h3>
        <p>〒989-3212　宮城県仙台市青葉区芋沢権現森山47</p>
        <p>TEL: <a href="tel:022-394-2392">022-394-2392</a></p>
        <a href="https://sportsgun.net/firing_range/sendai" class="btn_small">MORE</a>
      </div>
    </li>
    <li>
      <div class="shopInfo">
        <h3 class="shopListName">男鹿市クレー射撃場</h3>
        <p>〒010-0343 </p>
        <p>秋田県男鹿市脇本字上出戸沢字下タ川原44-2 </p>
        <p>TEL: <a href="tel:0185-25-4143">0185-25-4143</a></p>
      </div>
    </li>
  </ul>
</div>
`;

describe("parseSportsgunHtml", () => {
  it("住所と電話番号を抽出する", () => {
    const ranges = parseSportsgunHtml({
      html: SAMPLE_HTML,
      area: "hokkaido_tohoku",
    });

    expect(ranges).toHaveLength(2);
    expect(ranges[0]).toMatchObject({
      name: "仙台綜合射撃場",
      postalCode: "989-3212",
      address: "宮城県仙台市青葉区芋沢権現森山47",
      phone: "022-394-2392",
      area: "hokkaido_tohoku",
    });
    expect(ranges[1]).toMatchObject({
      name: "男鹿市クレー射撃場",
      postalCode: "010-0343",
      address: "秋田県男鹿市脇本字上出戸沢字下タ川原44-2",
      phone: "0185-25-4143",
    });
  });
});

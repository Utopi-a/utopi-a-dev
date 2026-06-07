import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseShajoukyoHtml } from "./parse-shajoukyo-html";

const SAMPLE_HTML = `
<table class="style_table">
  <tr>
    <th>地区</th><th>射撃場名</th><th>射面種別</th><th>所在地</th><th>指定区分</th><th>電話番号</th>
  </tr>
  <tr>
    <td>北海道</td>
    <td>豊滝クレー</td>
    <td>T･S</td>
    <td>札幌市南区</td>
    <td>教習･装弾</td>
    <td>011-596-2281</td>
  </tr>
  <tr>
    <td></td>
    <td><a href="http://urausu-rifle.com/shisetu.html">浦臼国際ライフル</a></td>
    <td>(LB･SB･AR)</td>
    <td>樺戸郡浦臼町</td>
    <td>教習･練習</td>
    <td>0125-67-3945</td>
  </tr>
  <tr>
    <td>青森</td>
    <td>青森散弾銃</td>
    <td>T･S</td>
    <td>青森市大字野沢</td>
    <td>教習･装弾</td>
    <td>017-739-8299</td>
  </tr>
  <tr>
    <td></td>
    <td>大東町摺沢</td>
    <td>T</td>
    <td>一関市大東町</td>
    <td>0191-75-4354</td>
    <td></td>
  </tr>
</table>
`;

describe("parseShajoukyoHtml", () => {
  it("都道府県の引き継ぎとリンク付き射撃場をパースする", () => {
    const ranges = parseShajoukyoHtml({ html: SAMPLE_HTML });

    expect(ranges).toHaveLength(4);
    expect(ranges[0]).toMatchObject({
      name: "豊滝クレー",
      prefecture: "北海道",
      location: "札幌市南区",
      address: "",
      defaultPurpose: "教習･装弾",
      phone: "011-596-2281",
      websiteUrl: null,
    });
    expect(ranges[1]).toMatchObject({
      name: "浦臼国際ライフル",
      prefecture: "北海道",
      websiteUrl: "http://urausu-rifle.com/shisetu.html",
    });
    expect(ranges[2]?.prefecture).toBe("青森");
    expect(ranges[3]).toMatchObject({
      name: "大東町摺沢",
      defaultPurpose: null,
      phone: "0191-75-4354",
    });
  });

  it("アップロード済みの実HTML断片からもパースできる", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "src/features/ammo-ledger/range-seed/scrape-shajoukyo-ranges/fixtures/national-page-snippet.html",
    );
    const html = await readFile(fixturePath, "utf8");
    const ranges = parseShajoukyoHtml({ html });

    expect(ranges.length).toBeGreaterThan(100);
    expect(ranges.some((range) => range.name === "豊滝クレー")).toBe(true);
    expect(ranges.some((range) => range.prefecture === "鹿児島")).toBe(true);
  });
});

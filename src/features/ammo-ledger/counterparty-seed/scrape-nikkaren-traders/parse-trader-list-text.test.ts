import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPublishedOn, parseTraderListText } from "./parse-trader-list-text";

const SAMPLE_TEXT = `
《日火連広域認定制度 ： 認定販売店・認定処分業者一覧表》
（１）認定を受けた者 令和６年１２月３日
【北海道】
1 (株)東火薬銃砲店 富良野市本町３番１号 0167-22-2713
13 (株）山崎火薬銃砲店
紋別郡遠軽町大通南二丁目１番地19
0158-42-2574
【青森県】
291 佐々木銃砲火薬店 十和田市洞内長根一番の七 0176-20-7880
【岩手県】
20 気仙郡建設業協同組合 大船渡市大船渡町字砂森１番地38 0192-27-0700
【群馬県】
53
ぐんまｼﾞｬｲｱﾝﾄ総合ｸﾚー･ﾗｲﾌﾙ射撃場 富岡市桑原604番地 0274-63-3073
【京都府】
158
(株)國友銃砲火薬店
京都市下京区寺町通仏光寺上る中之町580・
581番合地
075-351-3037
【沖縄県】
244
ザ・テラスホテルズ(株)コクワ流通サービ
スカンパニー コクワ火薬 火薬販売課
名護市字喜瀬1808番地 098-898-1363
（３）一般廃棄物の処分を業として行うもの
`;

describe("parseTraderListText", () => {
  it("都道府県付きの販売店をパースする", () => {
    const shops = parseTraderListText({ text: SAMPLE_TEXT });

    expect(shops.length).toBeGreaterThanOrEqual(7);
    expect(shops[0]).toMatchObject({
      listNumber: 1,
      name: "(株)東火薬銃砲店",
      prefecture: "北海道",
      location: "富良野市本町３番１号",
      address: "北海道富良野市本町３番１号",
      kind: "shop",
      phone: "0167-22-2713",
    });
    expect(shops.find((shop) => shop.listNumber === 13)).toMatchObject({
      name: "(株）山崎火薬銃砲店",
      prefecture: "北海道",
      location: "紋別郡遠軽町大通南二丁目１番地19",
      phone: "0158-42-2574",
    });
    expect(shops.find((shop) => shop.listNumber === 20)).toMatchObject({
      name: "気仙郡建設業協同組合",
      prefecture: "岩手県",
      location: "大船渡市大船渡町字砂森１番地38",
    });
    expect(shops.find((shop) => shop.listNumber === 53)).toMatchObject({
      name: "ぐんまｼﾞｬｲｱﾝﾄ総合ｸﾚー･ﾗｲﾌﾙ射撃場",
      prefecture: "群馬県",
      location: "富岡市桑原604番地",
    });
    expect(shops.find((shop) => shop.listNumber === 158)).toMatchObject({
      name: "(株)國友銃砲火薬店",
      prefecture: "京都府",
      location: "京都市下京区寺町通仏光寺上る中之町580・ 581番合地",
      phone: "075-351-3037",
    });
    expect(shops.find((shop) => shop.listNumber === 244)).toMatchObject({
      name: "ザ・テラスホテルズ(株)コクワ流通サービ スカンパニー コクワ火薬 火薬販売課",
      prefecture: "沖縄県",
      location: "名護市字喜瀬1808番地",
      phone: "098-898-1363",
    });
  });

  it("公表日を抽出する", () => {
    expect(extractPublishedOn({ text: SAMPLE_TEXT })).toBe("2024-12-03");
  });

  it("PDF 断片からもパースできる", async () => {
    const fixturePath = path.join(
      process.cwd(),
      "src/features/ammo-ledger/counterparty-seed/scrape-nikkaren-traders/fixtures/trader-list-snippet.txt",
    );
    const text = await readFile(fixturePath, "utf8");
    const shops = parseTraderListText({
      text: `令和６年１２月３日\n${text}\n（３）一般廃棄物の処分`,
    });

    expect(shops.length).toBeGreaterThan(20);
    expect(shops.some((shop) => shop.prefecture === "北海道")).toBe(true);
    expect(shops.some((shop) => shop.name.includes("東火薬銃砲店"))).toBe(true);
  });
});

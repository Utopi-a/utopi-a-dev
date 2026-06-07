import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { extractPdfText } from "./extract-pdf-text";
import { extractPublishedOn, parseTraderListText } from "./parse-trader-list-text";
import type { ScrapedGunShopDataset } from "./scraped-gun-shop";

const SOURCE_URL = "https://www.nikkaren.jp/pdf/trader_list.pdf";
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "gun-shops");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "nikkaren-traders.json");

async function fetchPdf({ url }: { url: string }): Promise<Buffer> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "utopi-a-dev-counterparty-seed/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`取得に失敗しました: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function scrapeNikkarenTraders(): Promise<ScrapedGunShopDataset> {
  const pdfBuffer = await fetchPdf({ url: SOURCE_URL });
  const text = await extractPdfText({ buffer: pdfBuffer });
  const shops = parseTraderListText({ text });

  return {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    sourcePublishedOn: extractPublishedOn({ text }),
    count: shops.length,
    shops,
  };
}

async function main() {
  const dataset = await scrapeNikkarenTraders();

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(`取得件数: ${dataset.count}`);
  console.log(`公表日: ${dataset.sourcePublishedOn ?? "不明"}`);
  console.log(`出力先: ${OUTPUT_FILE}`);
}

const isDirectRun =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

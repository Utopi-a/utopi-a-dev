import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseShajoukyoHtml } from "./parse-shajoukyo-html";
import type { ScrapedRangeDataset } from "./scraped-range";

const SOURCE_URL = "https://shajoukyo.ciao.jp/index.php?%E5%85%A8%E5%9B%BD";
const OUTPUT_DIR = path.join(process.cwd(), "tmp", "shooting-ranges");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "shajoukyo-ranges.json");

async function fetchHtml({ url }: { url: string }): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "utopi-a-dev-range-seed/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`取得に失敗しました: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export async function scrapeShajoukyoRanges(): Promise<ScrapedRangeDataset> {
  const html = await fetchHtml({ url: SOURCE_URL });
  const ranges = parseShajoukyoHtml({ html });

  return {
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    count: ranges.length,
    ranges,
  };
}

async function main() {
  const dataset = await scrapeShajoukyoRanges();

  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(`取得件数: ${dataset.count}`);
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

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sleep } from "../resolve-range-addresses/sleep";
import { RANGE_SEED_DATA_DIR, SPORTSGUN_RANGES_FILE } from "../seed-data-paths";
import { parseSportsgunHtml } from "./parse-sportsgun-html";
import type { ScrapedSportsgunRangeDataset } from "./scraped-sportsgun-range";

const BASE_URL = "https://sportsgun.net/firing_range";
const OUTPUT_FILE = SPORTSGUN_RANGES_FILE;

const AREAS = [
  "hokkaido_tohoku",
  "kanto_koushinetsu",
  "tokai",
  "kinki",
  "shikoku_chugoku",
  "kyushu",
] as const;

const REQUEST_INTERVAL_MS = 1_000;

async function fetchHtml({ url }: { url: string }): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "utopi-a-dev-range-seed/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`取得に失敗しました: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function scrapeArea({ area }: { area: (typeof AREAS)[number] }) {
  const ranges = [];
  let page = 1;

  while (true) {
    const url = `${BASE_URL}?sort=&area=${area}&page=${page}`;
    const html = await fetchHtml({ url });
    const pageRanges = parseSportsgunHtml({ html, area });

    if (pageRanges.length === 0) {
      break;
    }

    ranges.push(...pageRanges);
    page += 1;
    await sleep({ ms: REQUEST_INTERVAL_MS });
  }

  return ranges;
}

export async function scrapeSportsgunRanges(): Promise<ScrapedSportsgunRangeDataset> {
  const ranges = [];

  for (const [index, area] of AREAS.entries()) {
    const areaRanges = await scrapeArea({ area });
    ranges.push(...areaRanges);
    console.log(`${area}: ${areaRanges.length}件`);

    if (index < AREAS.length - 1) {
      await sleep({ ms: REQUEST_INTERVAL_MS });
    }
  }

  return {
    scrapedAt: new Date().toISOString(),
    sourceUrl: BASE_URL,
    count: ranges.length,
    ranges,
  };
}

async function main() {
  const dataset = await scrapeSportsgunRanges();

  await mkdir(RANGE_SEED_DATA_DIR, { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  const withAddress = dataset.ranges.filter((range) => range.address).length;
  console.log(`取得件数: ${dataset.count}`);
  console.log(`住所あり: ${withAddress}`);
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

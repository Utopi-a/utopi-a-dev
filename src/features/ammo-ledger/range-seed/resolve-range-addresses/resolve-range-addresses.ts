import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScrapedGunShopDataset } from "../../counterparty-seed/scrape-nikkaren-traders/scraped-gun-shop";
import { NIKKAREN_TRADERS_FILE } from "../../counterparty-seed/seed-data-paths";
import type { ScrapedRangeDataset } from "../scrape-shajoukyo-ranges/scraped-range";
import { scrapeSportsgunRanges } from "../scrape-sportsgun-ranges/scrape-sportsgun-ranges";
import type { ScrapedSportsgunRangeDataset } from "../scrape-sportsgun-ranges/scraped-sportsgun-range";
import {
  SHAJOUKYO_RANGES_FILE,
  SHAJOUKYO_RANGES_WITH_ADDRESSES_FILE,
  SPORTSGUN_RANGES_FILE,
} from "../seed-data-paths";
import { buildAddressCatalog } from "./build-address-catalog";
import { resolveRangeAddress } from "./resolve-range-address";
import { sleep } from "./sleep";

const INPUT_FILE = SHAJOUKYO_RANGES_FILE;
const OUTPUT_FILE = SHAJOUKYO_RANGES_WITH_ADDRESSES_FILE;
const SPORTSGUN_FILE = SPORTSGUN_RANGES_FILE;
const NIKKAREN_FILE = NIKKAREN_TRADERS_FILE;
const YAHOO_REQUEST_INTERVAL_MS = 6_000;

type ResolvedRangeDataset = ScrapedRangeDataset & {
  addressResolvedAt: string;
  resolvedCount: number;
  unresolvedCount: number;
};

function parseLimit({ argv }: { argv: string[] }): number | null {
  const limitIndex = argv.indexOf("--limit");
  if (limitIndex === -1) {
    return null;
  }

  const value = Number(argv[limitIndex + 1]);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("--limit には正の数を指定してください");
  }

  return value;
}

async function loadSportsgunDataset({
  refresh,
}: {
  refresh: boolean;
}): Promise<ScrapedSportsgunRangeDataset> {
  if (!refresh) {
    try {
      await access(SPORTSGUN_FILE);
      const raw = await readFile(SPORTSGUN_FILE, "utf8");
      return JSON.parse(raw) as ScrapedSportsgunRangeDataset;
    } catch {
      // fall through to scrape
    }
  }

  console.log("sportsgun.net をスクレイプします...");
  const dataset = await scrapeSportsgunRanges();
  await writeFile(SPORTSGUN_FILE, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  return dataset;
}

async function loadNikkarenDataset(): Promise<ScrapedGunShopDataset> {
  const raw = await readFile(NIKKAREN_FILE, "utf8");
  return JSON.parse(raw) as ScrapedGunShopDataset;
}

export async function resolveRangeAddresses({
  inputFile = INPUT_FILE,
  outputFile = OUTPUT_FILE,
  limit = null,
  refreshSportsgun = false,
}: {
  inputFile?: string;
  outputFile?: string;
  limit?: number | null;
  refreshSportsgun?: boolean;
}): Promise<ResolvedRangeDataset> {
  const [raw, sportsgunDataset, nikkarenDataset] = await Promise.all([
    readFile(inputFile, "utf8"),
    loadSportsgunDataset({ refresh: refreshSportsgun }),
    loadNikkarenDataset(),
  ]);

  const dataset = JSON.parse(raw) as ScrapedRangeDataset;
  const catalog = buildAddressCatalog({
    sportsgunRanges: sportsgunDataset.ranges,
    nikkarenShops: nikkarenDataset.shops,
  });

  const sportsgunWithAddress = sportsgunDataset.ranges.filter((range) => range.address).length;
  console.log(`カタログ: sportsgun ${sportsgunWithAddress}件, nikkaren ${nikkarenDataset.count}件`);

  const targets = limit ? dataset.ranges.slice(0, limit) : dataset.ranges;
  const resolvedRanges = [];

  for (const [index, range] of targets.entries()) {
    const resolved = await resolveRangeAddress({
      range,
      catalog,
      useYahooSearch: false,
    });
    resolvedRanges.push(resolved);

    const status = resolved.address
      ? `${resolved.addressSource}: ${resolved.address}`
      : "未解決（Yahoo待ち）";
    console.log(`[${index + 1}/${targets.length}] ${range.name} -> ${status}`);
  }

  const yahooTargets = resolvedRanges
    .map((range, index) => ({ range, index }))
    .filter(({ range }) => !range.address);

  if (yahooTargets.length > 0) {
    console.log(`Yahoo検索: ${yahooTargets.length}件（${YAHOO_REQUEST_INTERVAL_MS}ms 間隔）`);
  }

  for (const [yahooIndex, { range, index }] of yahooTargets.entries()) {
    const resolved = await resolveRangeAddress({
      range: targets[index],
      catalog,
      useYahooSearch: true,
    });
    resolvedRanges[index] = resolved;

    const status = resolved.address ? `${resolved.addressSource}: ${resolved.address}` : "未解決";
    console.log(`[Yahoo ${yahooIndex + 1}/${yahooTargets.length}] ${range.name} -> ${status}`);

    if (yahooIndex < yahooTargets.length - 1) {
      await sleep({ ms: YAHOO_REQUEST_INTERVAL_MS });
    }
  }

  const remaining = limit ? dataset.ranges.slice(limit) : [];
  const allRanges = [...resolvedRanges, ...remaining];
  const resolvedCount = resolvedRanges.filter((range) => range.address).length;
  const bySource = resolvedRanges.reduce<Record<string, number>>((counts, range) => {
    const key = range.addressSource ?? "null";
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const output: ResolvedRangeDataset = {
    ...dataset,
    count: allRanges.length,
    ranges: allRanges,
    addressResolvedAt: new Date().toISOString(),
    resolvedCount,
    unresolvedCount: resolvedRanges.length - resolvedCount,
  };

  await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("内訳:", bySource);
  return output;
}

async function main() {
  const limit = parseLimit({ argv: process.argv });
  const refreshSportsgun = process.argv.includes("--refresh-sportsgun");
  const output = await resolveRangeAddresses({ limit, refreshSportsgun });

  console.log(`解決: ${output.resolvedCount} / ${output.ranges.length}`);
  console.log(`未解決: ${output.unresolvedCount}`);
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

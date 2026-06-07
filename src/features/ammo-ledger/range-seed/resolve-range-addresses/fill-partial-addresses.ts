import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScrapedRangeDataset } from "../scrape-shajoukyo-ranges/scraped-range";
import { SHAJOUKYO_RANGES_WITH_ADDRESSES_FILE } from "../seed-data-paths";
import { buildPartialAddress } from "./build-partial-address";

const TARGET_FILE = SHAJOUKYO_RANGES_WITH_ADDRESSES_FILE;

type ResolvedRangeDataset = ScrapedRangeDataset & {
  addressResolvedAt?: string;
  resolvedCount?: number;
  unresolvedCount?: number;
};

export async function fillPartialAddresses({
  targetFile = TARGET_FILE,
}: {
  targetFile?: string;
} = {}): Promise<{ filledCount: number }> {
  const raw = await readFile(targetFile, "utf8");
  const dataset = JSON.parse(raw) as ResolvedRangeDataset;

  let filledCount = 0;
  for (const range of dataset.ranges) {
    if (range.address) {
      continue;
    }

    range.address = buildPartialAddress({
      prefecture: range.prefecture,
      location: range.location,
    });
    range.addressSource = "partial_location";
    filledCount += 1;
  }

  dataset.resolvedCount = dataset.ranges.filter((range) => range.address).length;
  dataset.unresolvedCount = dataset.ranges.length - dataset.resolvedCount;

  await writeFile(targetFile, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");
  return { filledCount };
}

async function main() {
  const { filledCount } = await fillPartialAddresses();
  console.log(`仮住所を設定: ${filledCount}件`);
  console.log(`出力先: ${TARGET_FILE}`);
}

const isDirectRun =
  process.argv[1] !== undefined && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}

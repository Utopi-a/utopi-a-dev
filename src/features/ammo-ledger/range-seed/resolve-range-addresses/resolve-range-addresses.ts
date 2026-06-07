import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ScrapedRangeDataset } from "../scrape-shajoukyo-ranges/scraped-range";
import { resolveRangeAddress } from "./resolve-range-address";
import { sleep } from "./sleep";

const INPUT_FILE = path.join(process.cwd(), "tmp", "shooting-ranges", "shajoukyo-ranges.json");
const OUTPUT_FILE = path.join(
  process.cwd(),
  "tmp",
  "shooting-ranges",
  "shajoukyo-ranges-with-addresses.json",
);
const REQUEST_INTERVAL_MS = 1_500;

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

export async function resolveRangeAddresses({
  inputFile = INPUT_FILE,
  outputFile = OUTPUT_FILE,
  limit = null,
}: {
  inputFile?: string;
  outputFile?: string;
  limit?: number | null;
}): Promise<ResolvedRangeDataset> {
  const raw = await readFile(inputFile, "utf8");
  const dataset = JSON.parse(raw) as ScrapedRangeDataset;
  const targets = limit ? dataset.ranges.slice(0, limit) : dataset.ranges;
  const resolvedRanges = [];

  for (const [index, range] of targets.entries()) {
    const resolved = await resolveRangeAddress({ range });
    resolvedRanges.push(resolved);

    const status = resolved.address ? `${resolved.addressSource}: ${resolved.address}` : "未解決";
    console.log(`[${index + 1}/${targets.length}] ${range.name} -> ${status}`);

    if (index < targets.length - 1) {
      await sleep({ ms: REQUEST_INTERVAL_MS });
    }
  }

  const remaining = limit ? dataset.ranges.slice(limit) : [];
  const allRanges = [...resolvedRanges, ...remaining];
  const resolvedCount = resolvedRanges.filter((range) => range.address).length;

  const output: ResolvedRangeDataset = {
    ...dataset,
    count: allRanges.length,
    ranges: allRanges,
    addressResolvedAt: new Date().toISOString(),
    resolvedCount,
    unresolvedCount: resolvedRanges.length - resolvedCount,
  };

  await writeFile(outputFile, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  return output;
}

async function main() {
  const limit = parseLimit({ argv: process.argv });
  const output = await resolveRangeAddresses({ limit });

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

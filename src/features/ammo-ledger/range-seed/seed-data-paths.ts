import path from "node:path";
import { fileURLToPath } from "node:url";

const RANGE_SEED_ROOT = path.dirname(fileURLToPath(import.meta.url));

export const RANGE_SEED_DATA_DIR = path.join(RANGE_SEED_ROOT, "seed-data");

export const SHAJOUKYO_RANGES_FILE = path.join(RANGE_SEED_DATA_DIR, "shajoukyo-ranges.json");

export const SHAJOUKYO_RANGES_WITH_ADDRESSES_FILE = path.join(
  RANGE_SEED_DATA_DIR,
  "shajoukyo-ranges-with-addresses.json",
);

export const SPORTSGUN_RANGES_FILE = path.join(RANGE_SEED_DATA_DIR, "sportsgun-ranges.json");

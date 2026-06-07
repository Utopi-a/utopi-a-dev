import path from "node:path";
import { fileURLToPath } from "node:url";

const COUNTERPARTY_SEED_ROOT = path.dirname(fileURLToPath(import.meta.url));

export const COUNTERPARTY_SEED_DATA_DIR = path.join(COUNTERPARTY_SEED_ROOT, "seed-data");

export const NIKKAREN_TRADERS_FILE = path.join(COUNTERPARTY_SEED_DATA_DIR, "nikkaren-traders.json");

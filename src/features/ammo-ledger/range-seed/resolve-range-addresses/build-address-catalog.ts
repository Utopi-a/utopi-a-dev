import type { ScrapedGunShop } from "../../counterparty-seed/scrape-nikkaren-traders/scraped-gun-shop";
import type { ScrapedSportsgunRange } from "../scrape-sportsgun-ranges/scraped-sportsgun-range";
import { normalizePhone } from "./normalize-phone";
import { rangeNamesMatch } from "./normalize-range-name";

export type AddressSource =
  | "sportsgun"
  | "nikkaren"
  | "website"
  | "yahoo_search"
  | "partial_location";

export type AddressCatalogEntry = {
  name: string;
  address: string;
  source: AddressSource;
};

export type AddressCatalog = {
  lookupByPhone: ({ phone }: { phone: string | null }) => AddressCatalogEntry | null;
  lookupByName: ({ name }: { name: string }) => AddressCatalogEntry | null;
};

type CatalogRecord = {
  name: string;
  address: string;
  source: AddressSource;
};

function addPhoneEntry({
  byPhone,
  phone,
  record,
}: {
  byPhone: Map<string, CatalogRecord>;
  phone: string | null;
  record: CatalogRecord;
}) {
  const normalizedPhone = normalizePhone({ phone });
  if (!normalizedPhone || !record.address) {
    return;
  }

  const existing = byPhone.get(normalizedPhone);
  if (!existing || record.source === "sportsgun") {
    byPhone.set(normalizedPhone, record);
  }
}

export function buildAddressCatalog({
  sportsgunRanges,
  nikkarenShops,
}: {
  sportsgunRanges: ScrapedSportsgunRange[];
  nikkarenShops: ScrapedGunShop[];
}): AddressCatalog {
  const byPhone = new Map<string, CatalogRecord>();
  const byName: CatalogRecord[] = [];

  for (const shop of nikkarenShops) {
    const record = {
      name: shop.name,
      address: shop.address,
      source: "nikkaren" as const,
    };
    addPhoneEntry({ byPhone, phone: shop.phone, record });
    if (record.address) {
      byName.push(record);
    }
  }

  for (const range of sportsgunRanges) {
    const record = {
      name: range.name,
      address: range.address,
      source: "sportsgun" as const,
    };
    addPhoneEntry({ byPhone, phone: range.phone, record });
    if (record.address) {
      byName.unshift(record);
    }
  }

  return {
    lookupByPhone: ({ phone }) => {
      const normalizedPhone = normalizePhone({ phone });
      if (!normalizedPhone) {
        return null;
      }

      const record = byPhone.get(normalizedPhone);
      return record ?? null;
    },
    lookupByName: ({ name }) => {
      const match = byName.find((record) => rangeNamesMatch({ left: name, right: record.name }));
      return match ?? null;
    },
  };
}

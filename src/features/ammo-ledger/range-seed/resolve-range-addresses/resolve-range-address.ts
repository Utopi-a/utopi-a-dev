import type { ScrapedRange } from "../scrape-shajoukyo-ranges/scraped-range";
import type { AddressCatalog, AddressSource } from "./build-address-catalog";
import { scrapeWebsiteAddress } from "./scrape-website-address";
import { searchYahooAddress } from "./search-yahoo-address";

export type ResolvedRange = ScrapedRange & {
  addressSource: AddressSource | null;
};

export async function resolveRangeAddress({
  range,
  catalog,
  useYahooSearch = true,
}: {
  range: ScrapedRange;
  catalog: AddressCatalog;
  useYahooSearch?: boolean;
}): Promise<ResolvedRange> {
  const phoneMatch = catalog.lookupByPhone({ phone: range.phone });
  if (phoneMatch) {
    return {
      ...range,
      address: phoneMatch.address,
      addressSource: phoneMatch.source,
    };
  }

  const nameMatch = catalog.lookupByName({ name: range.name });
  if (nameMatch) {
    return {
      ...range,
      address: nameMatch.address,
      addressSource: nameMatch.source,
    };
  }

  if (range.websiteUrl) {
    const websiteAddress = await scrapeWebsiteAddress({
      websiteUrl: range.websiteUrl,
      location: range.location,
      name: range.name,
      phone: range.phone,
    });

    if (websiteAddress) {
      return {
        ...range,
        address: websiteAddress,
        addressSource: "website",
      };
    }
  }

  if (useYahooSearch) {
    const yahooAddress = await searchYahooAddress({
      name: range.name,
      prefecture: range.prefecture,
      location: range.location,
      phone: range.phone,
    });

    if (yahooAddress) {
      return {
        ...range,
        address: yahooAddress,
        addressSource: "yahoo_search",
      };
    }
  }

  return {
    ...range,
    address: "",
    addressSource: null,
  };
}

import type { ScrapedRange } from "../scrape-shajoukyo-ranges/scraped-range";
import { scrapeWebsiteAddress } from "./scrape-website-address";
import { searchYahooAddress } from "./search-yahoo-address";

export type AddressSource = "website" | "yahoo_search" | null;

export type ResolvedRange = ScrapedRange & {
  addressSource: AddressSource;
};

export async function resolveRangeAddress({
  range,
}: {
  range: ScrapedRange;
}): Promise<ResolvedRange> {
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

  return {
    ...range,
    address: "",
    addressSource: null,
  };
}

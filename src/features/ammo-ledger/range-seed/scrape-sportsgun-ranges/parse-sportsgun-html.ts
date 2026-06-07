import type { ScrapedSportsgunRange } from "./scraped-sportsgun-range";

const PREFECTURE_PATTERN = /(?:北海道|(?:東京|京都|大阪)都?府?|[^\s　]{2,4}県)/;

function normalizeText({ value }: { value: string }): string {
  return value.replace(/\s+/g, " ").trim();
}

function parsePostalLine({ value }: { value: string }): {
  postalCode: string | null;
  address: string;
} {
  const normalized = normalizeText({ value: value.replace(/　/g, " ") });
  const postalMatch = normalized.match(/^(\d{3}-\d{4})\s*(.*)$/);
  if (!postalMatch) {
    return { postalCode: null, address: "" };
  }

  const [, postalCode, rest] = postalMatch;
  const addressMatch = rest.match(PREFECTURE_PATTERN);
  if (!addressMatch || !rest) {
    return { postalCode, address: "" };
  }

  const addressStart = rest.indexOf(addressMatch[0]);
  return {
    postalCode,
    address: normalizeText({ value: rest.slice(addressStart) }),
  };
}

function extractAddressFromBlock({ block }: { block: string }): string {
  const paragraphs = [...block.matchAll(/<p>([^<]*)<\/p>/g)].map((match) =>
    normalizeText({ value: (match[1] ?? "").replace(/　/g, " ") }),
  );

  for (const paragraph of paragraphs) {
    if (paragraph.startsWith("〒") || paragraph.startsWith("TEL") || paragraph.startsWith("FAX")) {
      continue;
    }

    if (PREFECTURE_PATTERN.test(paragraph)) {
      return paragraph;
    }
  }

  return "";
}

export function parseSportsgunHtml({
  html,
  area,
}: {
  html: string;
  area: string;
}): ScrapedSportsgunRange[] {
  const blocks = html.split('<h3 class="shopListName">').slice(1);
  const ranges: ScrapedSportsgunRange[] = [];

  for (const block of blocks) {
    const nameMatch = block.match(/^([^<]+)<\/h3>/);
    if (!nameMatch) {
      continue;
    }

    const name = normalizeText({ value: nameMatch[1] });
    const postalLineMatch = block.match(/<p>〒([^<]*)<\/p>/);
    const phoneMatch = block.match(/href="tel:([^"]+)"/);
    const detailUrlMatch = block.match(
      /<a href="(https:\/\/sportsgun\.net\/firing_range\/[^"]+)" class="btn_small">/,
    );

    const { postalCode, address: addressFromPostal } = parsePostalLine({
      value: postalLineMatch?.[1] ?? "",
    });
    const address = addressFromPostal || extractAddressFromBlock({ block });

    ranges.push({
      name,
      postalCode,
      address,
      phone: phoneMatch?.[1]?.trim() ?? null,
      detailUrl: detailUrlMatch?.[1] ?? null,
      area,
    });
  }

  return ranges;
}

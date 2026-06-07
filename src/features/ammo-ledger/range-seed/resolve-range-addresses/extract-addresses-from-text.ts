import { normalizePhone } from "./normalize-phone";

const PREFECTURE_PATTERN = "(?:北海道|(?:東京|京都|大阪)都?府?|[^\\s<>]{2,4}県)";

const ADDRESS_WITH_POSTAL_PATTERN = new RegExp(
  `〒\\s*(\\d{3}-\\d{4})\\s*(${PREFECTURE_PATTERN}[一-龥\\d\\-−‐・之ヶヵ々\\s]+)`,
  "g",
);

const ADDRESS_PATTERN = new RegExp(
  `(${PREFECTURE_PATTERN}[一-龥\\d\\-−‐・之ヶヵ々]+?\\d+(?:[-−‐]?\\d+)*(?:番地(?:の\\d+)?)?)`,
  "g",
);

export type ExtractedAddress = {
  address: string;
  postalCode: string | null;
  score: number;
};

function decodeHtmlEntities({ value }: { value: string }): string {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

function cleanAddress({ value }: { value: string }): string {
  return decodeHtmlEntities({ value })
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, "")
    .replace(/[;；].*$/, "")
    .replace(/TEL.*$/i, "")
    .replace(/電話.*$/, "")
    .replace(/FAX.*$/i, "")
    .trim();
}

function scoreAddress({
  address,
  postalCode,
  location,
  name,
  phone,
  text,
}: {
  address: string;
  postalCode: string | null;
  location: string;
  name: string;
  phone: string | null;
  text: string;
}): number {
  let score = 0;

  if (postalCode) {
    score += 3;
  }

  if (/\d/.test(address)) {
    score += 2;
  }

  if (location && address.includes(location.replace(/\s/g, ""))) {
    score += 5;
  }

  const compactName = name.replace(/[･・\s]/g, "");
  if (compactName.length >= 2 && text.includes(compactName.slice(0, 4))) {
    score += 2;
  }

  const normalizedPhone = normalizePhone({ phone });
  if (normalizedPhone) {
    const textDigits = text.replace(/\D/g, "");
    if (textDigits.includes(normalizedPhone)) {
      score += 8;
    }
  }

  if (address.length >= 10 && address.length <= 80) {
    score += 1;
  }

  return score;
}

function collectMatches({
  pattern,
  text,
  location,
  name,
  phone,
  withPostalCode = false,
}: {
  pattern: RegExp;
  text: string;
  location: string;
  name: string;
  phone: string | null;
  withPostalCode?: boolean;
}): ExtractedAddress[] {
  const matches: ExtractedAddress[] = [];

  for (const match of text.matchAll(pattern)) {
    const postalCode = withPostalCode ? (match[1] ?? null) : null;
    const rawAddress = withPostalCode ? match[2] : match[1];
    if (!rawAddress) {
      continue;
    }

    const address = cleanAddress({ value: rawAddress });
    if (address.length < 8) {
      continue;
    }

    matches.push({
      address,
      postalCode,
      score: scoreAddress({
        address,
        postalCode,
        location,
        name,
        phone,
        text,
      }),
    });
  }

  return matches;
}

function stripHtmlTags({ value }: { value: string }): string {
  return value.replace(/<[^>]+>/g, " ");
}

export function extractAddressesFromText({
  text,
  location,
  name,
  phone,
}: {
  text: string;
  location: string;
  name: string;
  phone: string | null;
}): ExtractedAddress[] {
  const decoded = stripHtmlTags({
    value: decodeHtmlEntities({ value: text }),
  });
  const candidates = [
    ...collectMatches({
      pattern: ADDRESS_WITH_POSTAL_PATTERN,
      text: decoded,
      location,
      name,
      phone,
      withPostalCode: true,
    }),
    ...collectMatches({
      pattern: ADDRESS_PATTERN,
      text: decoded,
      location,
      name,
      phone,
    }),
  ];

  const unique = new Map<string, ExtractedAddress>();
  for (const candidate of candidates) {
    const existing = unique.get(candidate.address);
    if (!existing || candidate.score > existing.score) {
      unique.set(candidate.address, candidate);
    }
  }

  return [...unique.values()].sort((left, right) => right.score - left.score);
}

export function pickBestAddress({
  text,
  location,
  name,
  phone,
}: {
  text: string;
  location: string;
  name: string;
  phone: string | null;
}): ExtractedAddress | null {
  const candidates = extractAddressesFromText({
    text,
    location,
    name,
    phone,
  });

  return candidates[0] ?? null;
}

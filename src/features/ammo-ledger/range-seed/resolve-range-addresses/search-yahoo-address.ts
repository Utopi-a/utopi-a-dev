import { pickBestAddress } from "./extract-addresses-from-text";
import { normalizePrefecture } from "./normalize-prefecture";

const BLOCKED_PAGE_PATTERN = /ご覧になろうとしているページは現在表示できません/;

function buildSearchQuery({
  name,
  prefecture,
  location,
}: {
  name: string;
  prefecture: string;
  location: string;
}): string {
  const normalizedPrefecture = normalizePrefecture({ prefecture });
  return `${name} ${normalizedPrefecture} ${location} 射撃場`;
}

export async function searchYahooAddress({
  name,
  prefecture,
  location,
  phone,
}: {
  name: string;
  prefecture: string;
  location: string;
  phone: string | null;
}): Promise<string | null> {
  const query = buildSearchQuery({ name, prefecture, location });
  const url = `https://search.yahoo.co.jp/search?p=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return null;
  }

  const html = await response.text();
  if (BLOCKED_PAGE_PATTERN.test(html)) {
    return null;
  }

  const best = pickBestAddress({
    text: html,
    location,
    name,
    phone,
  });

  if (!best || best.score < 6) {
    return null;
  }

  return best.address;
}

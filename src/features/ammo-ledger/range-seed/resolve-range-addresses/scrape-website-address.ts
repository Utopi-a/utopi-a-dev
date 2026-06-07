import { pickBestAddress } from "./extract-addresses-from-text";

const WEBSITE_HINT_PATHS = [
  "tenpo/",
  "tenpo/index.html",
  "access/",
  "access.html",
  "about/",
  "company/",
  "profile/",
  "shisetsu.html",
  "info/",
  "otoi/",
  "map/",
];

const LINK_KEYWORDS = [
  "店舗",
  "施設",
  "アクセス",
  "所在地",
  "住所",
  "会社概要",
  "tenpo",
  "access",
  "about",
  "shisetsu",
  "map",
];

async function fetchText({ url }: { url: string }): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "utopi-a-dev-range-seed/1.0",
      },
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return null;
    }

    return response.text();
  } catch {
    return null;
  }
}

function resolveUrl({ baseUrl, href }: { baseUrl: string; href: string }): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function collectCandidateUrls({ baseUrl, html }: { baseUrl: string; html: string }): string[] {
  const urls = new Set<string>([baseUrl]);
  const base = new URL(baseUrl);

  for (const path of WEBSITE_HINT_PATHS) {
    urls.add(new URL(path, base).toString());
  }

  const hrefPattern = /href=["']([^"'#]+)["']/gi;
  for (const match of html.matchAll(hrefPattern)) {
    const href = match[1];
    if (!href || !LINK_KEYWORDS.some((keyword) => href.includes(keyword))) {
      continue;
    }

    const resolved = resolveUrl({ baseUrl, href });
    if (!resolved) {
      continue;
    }

    const resolvedUrl = new URL(resolved);
    if (resolvedUrl.hostname !== base.hostname) {
      continue;
    }

    urls.add(resolved);
  }

  return [...urls].slice(0, 8);
}

export async function scrapeWebsiteAddress({
  websiteUrl,
  location,
  name,
  phone,
}: {
  websiteUrl: string;
  location: string;
  name: string;
  phone: string | null;
}): Promise<string | null> {
  const html = await fetchText({ url: websiteUrl });
  if (!html) {
    return null;
  }

  const candidateUrls = collectCandidateUrls({ baseUrl: websiteUrl, html });

  for (const url of candidateUrls) {
    const pageHtml = url === websiteUrl ? html : await fetchText({ url });
    if (!pageHtml) {
      continue;
    }

    const best = pickBestAddress({
      text: pageHtml,
      location,
      name,
      phone,
    });

    if (best && best.score >= 5) {
      return best.address;
    }
  }

  return null;
}

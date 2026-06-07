import type { ScrapedGunShop } from "./scraped-gun-shop";

const PHONE_PATTERN = /(0\d{1,4}[-−‐－ｰ]\d{1,4}[-−‐－ｰ]\d{3,4})$/;
const PREFECTURE_HEADER_PATTERN = /^【(.+?)】\s*$/;
const LIST_NUMBER_ONLY_PATTERN = /^(\d{1,3})$/;
const PAGE_NUMBER_MAX = 12;

type PendingEntry = {
  listNumber: number | null;
  nameParts: string[];
  locationParts: string[];
  phone: string | null;
};

function normalizeText({ value }: { value: string }): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizePhone({ value }: { value: string }): string {
  return value.replace(/[−‐－ｰ]/g, "-").trim();
}

function extractPhone({ line }: { line: string }): { phone: string; rest: string } | null {
  const match = line.match(PHONE_PATTERN);
  if (!match || match.index === undefined) {
    return null;
  }

  return {
    phone: normalizePhone({ value: match[1] }),
    rest: normalizeText({ value: line.slice(0, match.index) }),
  };
}

function looksLikeAddress({ text }: { text: string }): boolean {
  return /[市区町村郡]|\d+番|番地|号|丁目|字/.test(text);
}

function splitNameAndLocation({
  text,
}: {
  text: string;
}): { name: string; location: string } | null {
  const normalized = normalizeText({ value: text });
  if (!normalized) {
    return null;
  }

  const cityMatches = [...normalized.matchAll(/(\S*?[市区町村]\S*)/g)];
  if (cityMatches.length > 0) {
    const last = cityMatches[cityMatches.length - 1];
    if (last?.index !== undefined && last.index > 0) {
      const name = normalized.slice(0, last.index).trim();
      const location = normalized.slice(last.index).trim();
      if (name && location) {
        return { name, location };
      }
    }
  }

  const countyMatches = [...normalized.matchAll(/(\S*?郡\S*)/g)];
  if (countyMatches.length > 0) {
    const last = countyMatches[countyMatches.length - 1];
    if (last?.index !== undefined && last.index > 0) {
      const name = normalized.slice(0, last.index).trim();
      const location = normalized.slice(last.index).trim();
      if (name && location) {
        return { name, location };
      }
    }
  }

  return null;
}

function buildAddress({ prefecture, location }: { prefecture: string; location: string }): string {
  if (location.startsWith(prefecture)) {
    return location;
  }

  return `${prefecture}${location}`;
}

function buildShop({
  listNumber,
  name,
  location,
  prefecture,
  phone,
}: {
  listNumber: number | null;
  name: string;
  location: string;
  prefecture: string;
  phone: string | null;
}): ScrapedGunShop {
  return {
    listNumber,
    name,
    prefecture,
    location,
    address: buildAddress({ prefecture, location }),
    kind: "shop",
    phone,
  };
}

function finalizePending({
  pending,
  prefecture,
}: {
  pending: PendingEntry;
  prefecture: string;
}): ScrapedGunShop | null {
  const name = normalizeText({ value: pending.nameParts.join(" ") });
  const location = normalizeText({ value: pending.locationParts.join(" ") });
  if (!name || !location || !pending.phone) {
    return null;
  }

  return buildShop({
    listNumber: pending.listNumber,
    name,
    location,
    prefecture,
    phone: pending.phone,
  });
}

function isPageNumberLine({ line }: { line: string }): boolean {
  const match = line.match(LIST_NUMBER_ONLY_PATTERN);
  if (!match) {
    return false;
  }

  const value = Number(match[1]);
  return value <= PAGE_NUMBER_MAX;
}

function appendPendingLine({ pending, line }: { pending: PendingEntry; line: string }): void {
  const split = splitNameAndLocation({ text: line });
  if (split && pending.nameParts.length === 0) {
    pending.nameParts.push(split.name);
    pending.locationParts.push(split.location);
    return;
  }

  if (looksLikeAddress({ text: line })) {
    pending.locationParts.push(line);
    return;
  }

  pending.nameParts.push(line);
}

function applyPhoneLineToPending({
  pending,
  phone,
  rest,
}: {
  pending: PendingEntry;
  phone: string;
  rest: string;
}): void {
  pending.phone = phone;

  if (!rest) {
    return;
  }

  const split = splitNameAndLocation({ text: rest });
  if (split) {
    if (pending.nameParts.length === 0) {
      pending.nameParts.push(split.name);
    }
    pending.locationParts.push(split.location);
    return;
  }

  if (looksLikeAddress({ text: rest })) {
    pending.locationParts.push(rest);
    return;
  }

  pending.nameParts.push(rest);
}

function parseJapaneseNumber({ value }: { value: string }): number {
  return Number(
    value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0)),
  );
}

export function extractPublishedOn({ text }: { text: string }): string | null {
  const match = text.match(/令和\s*([0-9０-９]+)\s*年\s*([0-9０-９]+)\s*月\s*([0-9０-９]+)\s*日/);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const reiwaYear = parseJapaneseNumber({ value: year });
  const gregorianYear = 2018 + reiwaYear;
  const monthValue = String(parseJapaneseNumber({ value: month })).padStart(2, "0");
  const dayValue = String(parseJapaneseNumber({ value: day })).padStart(2, "0");
  return `${gregorianYear}-${monthValue}-${dayValue}`;
}

export function parseTraderListText({ text }: { text: string }): ScrapedGunShop[] {
  const endIndex = text.indexOf("（３）一般廃棄物の処分");
  const startIndex = text.indexOf("【北海道】");
  if (startIndex < 0) {
    throw new Error("認定販売店一覧の開始位置が見つかりません");
  }

  const body = text.slice(startIndex, endIndex > 0 ? endIndex : text.length);
  const lines = body
    .split("\n")
    .map((line) => normalizeText({ value: line }))
    .filter((line) => line.length > 0 && !isPageNumberLine({ line }));

  let currentPrefecture = "";
  let pending: PendingEntry | null = null;
  const shops: ScrapedGunShop[] = [];

  const flushPending = () => {
    if (!pending) {
      return;
    }

    const shop = finalizePending({ pending, prefecture: currentPrefecture });
    if (shop) {
      shops.push(shop);
    }
    pending = null;
  };

  for (const line of lines) {
    const prefectureMatch = line.match(PREFECTURE_HEADER_PATTERN);
    if (prefectureMatch) {
      flushPending();
      currentPrefecture = prefectureMatch[1];
      continue;
    }

    const listNumberOnly = line.match(LIST_NUMBER_ONLY_PATTERN);
    if (listNumberOnly) {
      flushPending();
      pending = {
        listNumber: Number(listNumberOnly[1]),
        nameParts: [],
        locationParts: [],
        phone: null,
      };
      continue;
    }

    const phoneExtracted = extractPhone({ line });
    if (phoneExtracted) {
      const listMatch = phoneExtracted.rest.match(/^(\d{1,3})\s+(.+)$/);
      if (listMatch) {
        flushPending();
        const split = splitNameAndLocation({ text: listMatch[2] });
        if (split) {
          shops.push(
            buildShop({
              listNumber: Number(listMatch[1]),
              name: split.name,
              location: split.location,
              prefecture: currentPrefecture,
              phone: phoneExtracted.phone,
            }),
          );
        }
        continue;
      }

      if (pending) {
        applyPhoneLineToPending({
          pending,
          phone: phoneExtracted.phone,
          rest: phoneExtracted.rest,
        });
        flushPending();
        continue;
      }

      const split = splitNameAndLocation({ text: phoneExtracted.rest });
      if (split) {
        shops.push(
          buildShop({
            listNumber: null,
            name: split.name,
            location: split.location,
            prefecture: currentPrefecture,
            phone: phoneExtracted.phone,
          }),
        );
      }
      continue;
    }

    if (pending) {
      appendPendingLine({ pending, line });
      continue;
    }

    const listMatch = line.match(/^(\d{1,3})\s+(.+)$/);
    if (listMatch) {
      pending = {
        listNumber: Number(listMatch[1]),
        nameParts: [listMatch[2]],
        locationParts: [],
        phone: null,
      };
    }
  }

  flushPending();
  return shops;
}

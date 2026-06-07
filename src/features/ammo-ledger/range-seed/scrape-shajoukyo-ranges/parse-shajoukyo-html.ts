import { JSDOM } from "jsdom";
import type { ScrapedRange } from "./scraped-range";

const PHONE_PATTERN = /^[\d\-−ｰ]+$/;

function normalizeText({ value }: { value: string }): string {
  return value.replace(/\s+/g, " ").trim();
}

function looksLikePhone({ value }: { value: string }): boolean {
  const normalized = normalizeText({ value });
  return normalized.length > 0 && PHONE_PATTERN.test(normalized);
}

function extractCellText({ cell }: { cell: Element }): string {
  return normalizeText({ value: cell.textContent ?? "" });
}

function extractNameCell({ cell }: { cell: Element }): {
  name: string;
  websiteUrl: string | null;
} {
  const link = cell.querySelector("a");
  if (link) {
    return {
      name: normalizeText({ value: link.textContent ?? "" }),
      websiteUrl: link.getAttribute("href"),
    };
  }

  return {
    name: extractCellText({ cell }),
    websiteUrl: null,
  };
}

function parseTableRow({
  cells,
  currentPrefecture,
}: {
  cells: string[];
  currentPrefecture: string;
}): { range: ScrapedRange | null; prefecture: string } {
  if (cells.length < 6) {
    return { range: null, prefecture: currentPrefecture };
  }

  const [regionCell, name, surfaceTypes, location, designationOrPhone, phoneCell] = cells;

  const prefecture = regionCell || currentPrefecture;
  if (!prefecture || !name) {
    return { range: null, prefecture: currentPrefecture };
  }

  let designation = designationOrPhone;
  let phone = phoneCell;

  if (!phone && looksLikePhone({ value: designationOrPhone })) {
    phone = designationOrPhone;
    designation = "";
  }

  return {
    prefecture,
    range: {
      name,
      prefecture,
      location,
      address: "",
      defaultPurpose: designation || null,
      phone: phone || null,
      surfaceTypes: surfaceTypes || null,
      websiteUrl: null,
    },
  };
}

export function parseShajoukyoHtml({ html }: { html: string }): ScrapedRange[] {
  const dom = new JSDOM(html);
  const table = dom.window.document.querySelector("table.style_table");
  if (!table) {
    throw new Error("射撃場一覧テーブル (table.style_table) が見つかりません");
  }

  const rows = [...table.querySelectorAll("tr")].slice(1);
  const ranges: ScrapedRange[] = [];
  let currentPrefecture = "";

  for (const row of rows) {
    const cells = [...row.querySelectorAll("td")];
    if (cells.length < 6) {
      continue;
    }

    const regionCell = extractCellText({ cell: cells[0] });
    if (regionCell) {
      currentPrefecture = regionCell;
    }

    const { name, websiteUrl } = extractNameCell({ cell: cells[1] });
    if (!name) {
      continue;
    }

    const parsed = parseTableRow({
      cells: [
        regionCell,
        name,
        extractCellText({ cell: cells[2] }),
        extractCellText({ cell: cells[3] }),
        extractCellText({ cell: cells[4] }),
        extractCellText({ cell: cells[5] }),
      ],
      currentPrefecture,
    });

    currentPrefecture = parsed.prefecture;

    if (!parsed.range) {
      continue;
    }

    ranges.push({
      ...parsed.range,
      websiteUrl,
    });
  }

  return ranges;
}

export type ScrapedSportsgunRange = {
  name: string;
  postalCode: string | null;
  address: string;
  phone: string | null;
  detailUrl: string | null;
  area: string;
};

export type ScrapedSportsgunRangeDataset = {
  scrapedAt: string;
  sourceUrl: string;
  count: number;
  ranges: ScrapedSportsgunRange[];
};

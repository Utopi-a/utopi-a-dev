/** 日火連 PDF から取得した認定販売店の生データ */
export type ScrapedGunShop = {
  /** ammo_counterparty.name にそのまま入れられる店名 */
  name: string;
  /** 都道府県 */
  prefecture: string;
  /**
   * PDF の所在地列（市区町村以下）。
   * 都道府県は含まない。
   */
  location: string;
  /** ammo_counterparty.address 用（都道府県 + location） */
  address: string;
  /** ammo_counterparty.kind。販売店は常に shop */
  kind: "shop";
  /** 一覧表の番号（memo 用） */
  listNumber: number | null;
  /** 電話番号（memo 用） */
  phone: string | null;
};

export type ScrapedGunShopDataset = {
  scrapedAt: string;
  sourceUrl: string;
  sourcePublishedOn: string | null;
  count: number;
  shops: ScrapedGunShop[];
};

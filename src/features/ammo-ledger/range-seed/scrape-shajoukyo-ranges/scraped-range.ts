/** 全日本指定射撃場協会サイトから取得した射撃場の生データ */
export type ScrapedRange = {
  /** ammo_range.name にそのまま入れられる射撃場名 */
  name: string;
  /** 都道府県（サイトの「地区」列。略称のことがある） */
  prefecture: string;
  /**
   * サイトの「所在地」列（市区町村レベル）。
   * 住所検索は別途行う想定のため、address とは分離する。
   */
  location: string;
  /**
   * ammo_range.address 用。スクレイプ時点では未確定のため空文字。
   * 後からジオコーディング等で埋める。
   */
  address: string;
  /** ammo_range.defaultPurpose にマッピングしやすい指定区分 */
  defaultPurpose: string | null;
  /** 電話番号（memo や住所検索のヒント用） */
  phone: string | null;
  /** 射面種別（memo 用の参考情報） */
  surfaceTypes: string | null;
  /** 公式サイト URL（あれば） */
  websiteUrl: string | null;
  /** 住所の取得元。未解決時は null */
  addressSource?: "website" | "yahoo_search" | null;
};

export type ScrapedRangeDataset = {
  scrapedAt: string;
  sourceUrl: string;
  count: number;
  ranges: ScrapedRange[];
};

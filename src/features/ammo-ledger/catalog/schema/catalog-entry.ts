export type CatalogSource = "gun_shop" | "range";

export type CatalogEntry = {
  catalogId: string;
  name: string;
  address: string;
  prefecture: string;
  location: string;
  phone: string | null;
  defaultPurpose?: string | null;
  kind?: "shop";
  catalogSource?: CatalogSource;
};

export type PickerMasterEntry = {
  id: string;
  name: string;
  address: string;
  catalogId: string | null;
};

export type CatalogPrefectureGroup = {
  prefecture: string;
  entries: CatalogEntry[];
};

export type MasterPickerData = {
  favorites: CatalogEntry[];
  recent: PickerMasterEntry[];
  registered: PickerMasterEntry[];
  catalogByPrefecture: CatalogPrefectureGroup[];
  favoriteCatalogIds: string[];
  registeredCatalogIds: string[];
  counterpartyIdByCatalogId?: Record<string, string>;
  includesRangeCatalog?: boolean;
  registeredRangeMasters?: PickerMasterEntry[];
};

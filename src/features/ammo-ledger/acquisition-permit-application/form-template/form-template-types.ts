export type FieldAlign = "left" | "center" | "right";
export type OverlayFieldVariant = "text" | "checkbox";

export type OverlayFieldDef = {
  id: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  align?: FieldAlign;
  variant?: OverlayFieldVariant;
  /** false のとき base fontSize のまま。デフォルトは width があるフィールドで自動調整 */
  fitText?: boolean;
};

export type RepeatingRowColumnDef = {
  id: string;
  x: number;
  width: number;
  fontSize: number;
  align?: FieldAlign;
  /** 行内での縦方向オフセット（mm） */
  yOffset?: number;
};

export type RepeatingRowMap = {
  startY: number;
  rowHeight: number;
  maxRowsPerPage: number;
  columns: RepeatingRowColumnDef[];
};

export type FormTemplate = {
  id: string;
  version: string;
  label: string;
  sourceUrl: string;
  pageWidthMm: number;
  pageHeightMm: number;
  pages: { imagePath: string }[];
  fields: OverlayFieldDef[];
  repeatingRows?: RepeatingRowMap;
};

export type ApplicationFieldValues = Record<string, string>;

export type SupplementRowFieldValues = {
  rowIndex: number;
  values: Record<string, string>;
};

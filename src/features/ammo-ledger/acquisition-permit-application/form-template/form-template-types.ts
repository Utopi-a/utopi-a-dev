export type FieldAlign = "left" | "center" | "right";

export type OverlayFieldDef = {
  id: string;
  page: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  fontSize: number;
  align?: FieldAlign;
};

export type RepeatingRowColumnDef = {
  id: string;
  x: number;
  width: number;
  fontSize: number;
  align?: FieldAlign;
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

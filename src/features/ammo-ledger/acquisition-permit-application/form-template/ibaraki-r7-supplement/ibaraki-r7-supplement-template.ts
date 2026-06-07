import type { FormTemplate } from "../form-template-types";

/** 別記様式第2号 別紙（r4-15 版）。10行。座標は mm。 */
export const ibarakiR7SupplementTemplate: FormTemplate = {
  id: "ibaraki-r7-supplement",
  version: "r4-15",
  label: "猟銃用火薬類等譲受許可申請書（別紙）",
  sourceUrl:
    "https://www.pref.ibaraki.jp/kenkei/a06_shinsei/swords_firearms/documents/juhotodoke-r4-15.pdf",
  pageWidthMm: 210,
  pageHeightMm: 297,
  pages: [{ imagePath: "/forms/acquisition-permit/ibaraki-r7/png/supplement-r4-15.pdf.png" }],
  fields: [{ id: "planPurposeLabel", page: 0, x: 118, y: 18, width: 40, fontSize: 3.2 }],
  repeatingRows: {
    startY: 36,
    rowHeight: 19.5,
    maxRowsPerPage: 10,
    columns: [
      { id: "year", x: 8, width: 12, fontSize: 3.0, align: "center" },
      { id: "month", x: 22, width: 10, fontSize: 3.0, align: "center" },
      { id: "period", x: 34, width: 10, fontSize: 2.8, align: "center" },
      { id: "purchaseQuantity", x: 48, width: 14, fontSize: 3.0, align: "right" },
      { id: "consumptionQuantity", x: 68, width: 14, fontSize: 3.0, align: "right" },
      { id: "location", x: 86, width: 52, fontSize: 2.8 },
      { id: "memo", x: 142, width: 58, fontSize: 2.6 },
    ],
  },
};

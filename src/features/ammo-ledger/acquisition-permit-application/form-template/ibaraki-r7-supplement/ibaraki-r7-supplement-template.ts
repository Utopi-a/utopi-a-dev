import type { FormTemplate } from "../form-template-types";

/** 別記様式第2号 別紙（r4-15 版）。PNG は申請書表と同じ左余白（20.1mm）に正規化済み。 */
export const ibarakiR7SupplementTemplate: FormTemplate = {
  id: "ibaraki-r7-supplement",
  version: "r4-15",
  label: "猟銃用火薬類等譲受許可申請書（別紙）",
  sourceUrl:
    "https://www.pref.ibaraki.jp/kenkei/a06_shinsei/swords_firearms/documents/juhotodoke-r4-15.pdf",
  pageWidthMm: 210,
  pageHeightMm: 297,
  pages: [{ imagePath: "/forms/acquisition-permit/ibaraki-r7/png/supplement-r4-15.pdf.png" }],
  fields: [{ id: "planPurposeLabel", page: 0, x: 116, y: 15.5, width: 30, fontSize: 3.0 }],
  repeatingRows: {
    startY: 50,
    rowHeight: 19,
    maxRowsPerPage: 10,
    columns: [
      { id: "year", x: 23, width: 20, fontSize: 2.8, align: "right", yOffset: 1.2 },
      { id: "month", x: 23, width: 20, fontSize: 2.8, align: "right", yOffset: 6.8 },
      { id: "period", x: 23, width: 20, fontSize: 2.8, align: "left", yOffset: 12.4 },
      { id: "purchaseQuantity", x: 46, width: 18, fontSize: 3.0, align: "right", yOffset: 4 },
      { id: "consumptionQuantity", x: 66, width: 18, fontSize: 3.0, align: "right", yOffset: 4 },
      { id: "location", x: 119, width: 30, fontSize: 2.4, yOffset: 1.5 },
      { id: "memo", x: 152, width: 36, fontSize: 2.4, yOffset: 1.5 },
    ],
  },
};

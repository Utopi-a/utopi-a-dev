import type { FormTemplate } from "@/features/ammo-ledger/acquisition-permit-application/form-template/form-template-types";

export const hokkaidoForm9SupplementTemplate: FormTemplate = {
  id: "hokkaido-form9-supplement",
  version: "form9-supplement-initial-v1",
  label: "猟銃等所持許可更新申請書 別紙（様式第9号）",
  sourceUrl: "https://www.police.pref.hokkaido.lg.jp/down_load/06/05.pdf",
  pageWidthMm: 210,
  pageHeightMm: 297,
  pages: [{ imagePath: "/forms/gun-possession-permit/hokkaido/png/form9-supplement.png" }],
  fields: [],
  repeatingRows: {
    startY: 42,
    rowHeight: 28,
    maxRowsPerPage: 5,
    columns: [
      { id: "gunCategoryRifle", x: 24, width: 6, height: 6, fontSize: 6, variant: "checkbox" },
      { id: "gunCategoryShotgun", x: 40, width: 6, height: 6, fontSize: 6, variant: "checkbox" },
      { id: "gunCategoryAirRifle", x: 56, width: 6, height: 6, fontSize: 6, variant: "checkbox" },
      {
        id: "gunCategoryHuntingRifleOther",
        x: 72,
        width: 6,
        height: 6,
        fontSize: 6,
        variant: "checkbox",
      },
      { id: "permitNumber", x: 100, width: 40, fontSize: 4.5 },
      { id: "permitDateYear", x: 145, width: 12, fontSize: 4, align: "right" },
      { id: "permitDateMonth", x: 160, width: 8, fontSize: 4, align: "right" },
      { id: "permitDateDay", x: 172, width: 8, fontSize: 4, align: "right" },
    ],
  },
};

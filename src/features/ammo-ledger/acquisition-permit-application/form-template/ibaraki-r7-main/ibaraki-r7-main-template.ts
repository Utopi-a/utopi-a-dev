import type { FormTemplate } from "../form-template-types";

/** 座標は mm 単位。実機印刷で微調整する前提の初期値。 */
export const ibarakiR7MainTemplate: FormTemplate = {
  id: "ibaraki-r7-main",
  version: "r7-2025-03",
  label: "猟銃用火薬類等譲受許可申請書（別記様式第2号）",
  sourceUrl:
    "https://www.pref.ibaraki.jp/kenkei/a06_shinsei/swords_firearms/documents/juhotodoke-r7-14.pdf",
  pageWidthMm: 210,
  pageHeightMm: 297,
  pages: [{ imagePath: "/forms/acquisition-permit/ibaraki-r7/png/main-r7-14.pdf.png" }],
  fields: [
    { id: "applicationDate", page: 0, x: 145, y: 28, width: 55, fontSize: 3.2, align: "right" },
    { id: "ownerAddress", page: 0, x: 38, y: 52, width: 155, fontSize: 3.2 },
    { id: "ownerFurigana", page: 0, x: 38, y: 58, width: 155, fontSize: 2.8 },
    { id: "ownerName", page: 0, x: 38, y: 64, width: 155, fontSize: 3.6 },
    { id: "ownerBirthDate", page: 0, x: 38, y: 72, width: 80, fontSize: 3.2 },
    { id: "ownerPhone", page: 0, x: 125, y: 72, width: 68, fontSize: 3.2 },
    { id: "ammoName", page: 0, x: 38, y: 88, width: 40, fontSize: 3.2 },
    { id: "requestedQuantity", page: 0, x: 125, y: 88, width: 30, fontSize: 3.2, align: "right" },
    { id: "currentHomeStock", page: 0, x: 38, y: 112, width: 155, fontSize: 3.2 },
    { id: "gunTypeAndCaliber", page: 0, x: 38, y: 100, width: 80, fontSize: 3.2 },
    { id: "permitCertificateNumber", page: 0, x: 125, y: 100, width: 68, fontSize: 3.2 },
    { id: "permitPurpose", page: 0, x: 38, y: 124, width: 155, fontSize: 3.2 },
    { id: "validFrom", page: 0, x: 38, y: 132, width: 35, fontSize: 3.2 },
    { id: "validTo", page: 0, x: 88, y: 132, width: 35, fontSize: 3.2 },
    { id: "storageLocation", page: 0, x: 38, y: 140, width: 155, fontSize: 3.2 },
    { id: "consumptionPlanNote", page: 0, x: 38, y: 148, width: 155, fontSize: 3.0 },
  ],
};

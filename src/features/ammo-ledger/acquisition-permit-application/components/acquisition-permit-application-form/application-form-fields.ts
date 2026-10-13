/**
 * 様式（別記様式第2号）に印字する入力欄。様式には任意と書かれた欄がなく、
 * 空のまま印刷すると提出できない書類になるため、すべて入力を求める。
 */
export const requiredApplicationFields = {
  prefectureName: { id: "prefecture-name", label: "提出先（公安委員会）" },
  applicationDate: { id: "application-date", label: "申請日" },
  ownerName: { id: "owner-name", label: "氏名" },
  ownerFurigana: { id: "owner-furigana", label: "ふりがな" },
  ownerAddress: { id: "owner-address", label: "住所" },
  ownerBirthDate: { id: "owner-birth-date", label: "生年月日" },
  ownerPhone: { id: "owner-phone", label: "電話番号" },
  ammoName: { id: "ammo-name", label: "火薬類の名称" },
  permitPurpose: { id: "permit-purpose", label: "譲受の目的" },
  requestedQuantity: { id: "requested-quantity", label: "申請数量（発）" },
  homeStock: { id: "home-stock", label: "現保有数量（発）" },
  validFrom: { id: "valid-from", label: "譲受期間（開始）" },
  validTo: { id: "valid-to", label: "譲受期間（終了）" },
  storageLocation: { id: "storage-location", label: "貯蔵又は保管する場所" },
  possessionPermitCertificateNumber: {
    id: "possession-permit-certificate-number",
    label: "銃砲所持許可証の番号",
  },
} as const;

export type RequiredApplicationFieldKey = keyof typeof requiredApplicationFields;

export type MissingApplicationField = { fieldId: string; label: string };

export const selectedGunsFieldId = "selected-guns";
export const counterpartyFieldId = "counterparty";
export const generatePlanFieldId = "generate-consumption-plan";

export function findMissingApplicationFields({
  values,
  selectedGunCount,
  hasCounterparty,
  planStatus,
}: {
  values: Record<RequiredApplicationFieldKey, string>;
  selectedGunCount: number;
  hasCounterparty: boolean;
  planStatus: "ready" | "outdated" | "missing";
}): MissingApplicationField[] {
  const missingFields: MissingApplicationField[] = Object.entries(requiredApplicationFields)
    .filter(([key]) => values[key as RequiredApplicationFieldKey].trim() === "")
    .map(([, field]) => ({ fieldId: field.id, label: field.label }));

  if (selectedGunCount === 0) {
    missingFields.push({ fieldId: selectedGunsFieldId, label: "使用銃" });
  }
  if (!hasCounterparty) {
    missingFields.push({ fieldId: counterpartyFieldId, label: "譲渡者（購入先）" });
  }
  if (planStatus !== "ready") {
    missingFields.push({
      fieldId: generatePlanFieldId,
      label:
        planStatus === "outdated" ? "消費計画（入力が変わったので作り直してください）" : "消費計画",
    });
  }
  return missingFields;
}

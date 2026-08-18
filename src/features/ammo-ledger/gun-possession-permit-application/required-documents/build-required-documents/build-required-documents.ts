import type { GunPermitApplicationInput } from "../../gun-possession-permit-application-types";
import type { RequiredDocumentItem } from "../required-document-types";

export function buildRequiredDocuments({
  input,
}: {
  input: Pick<
    GunPermitApplicationInput,
    | "kind"
    | "hasExistingPermit"
    | "existingPermitSubmittedToSamePrefecture"
    | "issuesNewPermitCard"
    | "isAge75OrOlder"
    | "omitCohabitantForm"
    | "omitResidentRecord"
    | "omitResume"
  >;
}): RequiredDocumentItem[] {
  const canOmitHouseholdDocs =
    input.hasExistingPermit &&
    input.existingPermitSubmittedToSamePrefecture &&
    input.kind !== "new";

  const items: RequiredDocumentItem[] = [];

  if (input.kind === "renewal") {
    items.push({
      id: "form9",
      label: "猟銃等所持許可更新申請書（様式第9号）",
      description: "更新対象の銃を別紙に記載",
      source: "generated",
      status: "required",
      formKind: "form9",
    });
  } else {
    items.push({
      id: "form6",
      label: "銃砲所持許可申請書（様式第6号）",
      description: "申請銃ごとに別紙を作成",
      source: "generated",
      status: "required",
      formKind: "form6",
    });
  }

  items.push(
    {
      id: "resume",
      label: "経歴書（別表第2の別記様式）",
      description: "職歴・住所歴・所持歴・犯歴",
      source: "generated",
      status: resolveOmittableStatus({
        canOmit: canOmitHouseholdDocs,
        omitted: input.omitResume,
        issuesNewPermitCard: input.issuesNewPermitCard,
      }),
      formKind: "resume",
      note: canOmitHouseholdDocs
        ? "同一公安委員会への追加・更新では省略可（新許可証交付時を除く）"
        : undefined,
    },
    {
      id: "cohabitant",
      label: "同居親族書（様式第13号）",
      description: "同居親族の氏名・続柄・生年月日",
      source: "generated",
      status: resolveOmittableStatus({
        canOmit: canOmitHouseholdDocs,
        omitted: input.omitCohabitantForm,
        issuesNewPermitCard: input.issuesNewPermitCard,
      }),
      formKind: "form13",
      note: canOmitHouseholdDocs ? "同一公安委員会への追加・更新では省略可" : undefined,
    },
    {
      id: "diagnosis",
      label: "診断書",
      description: "精神保健指定医またはかかりつけ医が作成（交付後3か月以内）",
      source: "external",
      status: "required",
      note: "医師が記入。様式は県警掲載版を参照",
    },
    {
      id: "resident_record",
      label: "住民票の写し（本籍入り）",
      description: "市町村長発行",
      source: "external",
      status: resolveOmittableStatus({
        canOmit: canOmitHouseholdDocs,
        omitted: input.omitResidentRecord,
        issuesNewPermitCard: input.issuesNewPermitCard,
      }),
      note: canOmitHouseholdDocs ? "追加申請で省略可の場合あり" : undefined,
    },
    {
      id: "identity",
      label: "身分証明書（本籍入り）",
      description: "市町村長発行（交付後3か月以内）",
      source: "external",
      status: input.kind === "renewal" && !input.issuesNewPermitCard ? "omittable" : "required",
      note:
        input.kind === "renewal" && !input.issuesNewPermitCard
          ? "新たな許可証を伴わない更新では省略可"
          : undefined,
    },
    {
      id: "photo",
      label: "写真（3.0×2.4cm）",
      description: "提出前6か月以内・無帽正面・無背景",
      source: "external",
      status: input.kind === "renewal" && !input.issuesNewPermitCard ? "omittable" : "required",
    },
    {
      id: "storage_report",
      label: "銃砲等保管状況報告書",
      description: "保管設備の説明・図面",
      source: "external",
      status: "required",
      note: "様式は県によって異なる場合があります",
    },
    {
      id: "investigation_contacts",
      label: "調査先とする知人等に関する申告書",
      description: "親族・友人・猟友会・射撃団体等の連絡先",
      source: "external",
      status: "required",
      note: "様式は県によって異なる場合があります",
    },
  );

  if (input.kind !== "renewal") {
    items.push({
      id: "transfer_consent",
      label: "譲渡等承諾書（様式第12号）",
      description: "譲渡人（銃砲店等）が作成。内容が同一なら第6号別紙で省略記載可",
      source: "generated",
      status: "required",
      formKind: "form12",
    });
  }

  if (input.kind === "renewal") {
    items.push({
      id: "usage_record",
      label: "使用実績報告書（様式第74号）",
      description: "直前2年間の使用実績",
      source: "generated",
      status: "required",
      formKind: "form74",
      note: "帳簿の消費記録から自動生成できます",
    });
  }

  items.push(
    {
      id: "lecture_certificate",
      label: "講習修了証明書",
      description: "猟銃等講習会の修了証",
      source: "present_only",
      status: "required",
    },
    {
      id: "teaching_certificate",
      label: "教習修了証明書",
      description: "猟銃の新規所持・追加で必要（狩猟用途）",
      source: "present_only",
      status: input.kind === "renewal" ? "omittable" : "required",
      note: input.kind === "renewal" ? "更新では不要" : "猟銃の新規・追加で提示",
    },
    {
      id: "skill_lecture_certificate",
      label: "技能講習修了証明書",
      description: "更新・追加で必要な場合あり",
      source: "present_only",
      status: input.kind === "new" ? "omittable" : "required",
      note: input.kind === "new" ? "新規1本目では不要" : "更新・追加では受講が必要",
    },
    {
      id: "revenue_stamp",
      label: "収入証紙（手数料）",
      description: "都道府県収入証紙。件数・手続きにより金額が変わる",
      source: "external",
      status: "required",
      note: "提出先の警察署に確認",
    },
  );

  if (input.isAge75OrOlder) {
    items.push({
      id: "cognitive_exam",
      label: "認知機能検査",
      description: "75歳以上は受検が必要（例外あり）",
      source: "external",
      status: "required",
    });
  }

  if (input.kind === "new") {
    items.push(
      {
        id: "lecture_application",
        label: "講習受講申込書（様式第19号）",
        description: "講習会申込（許可申請の前段階）",
        source: "external",
        status: "required",
        note: "初めて猟銃を所持する場合は講習→教習→申請の順",
      },
      {
        id: "teaching_qualification",
        label: "教習資格認定申請書（様式第10号）",
        description: "射撃教習を受ける資格の認定",
        source: "external",
        status: "required",
        note: "猟銃の新規所持で必要",
      },
    );
  }

  return items;
}

function resolveOmittableStatus({
  canOmit,
  omitted,
  issuesNewPermitCard,
}: {
  canOmit: boolean;
  omitted?: boolean;
  issuesNewPermitCard: boolean;
}): RequiredDocumentItem["status"] {
  if (issuesNewPermitCard) {
    return omitted ? "omitted" : "required";
  }
  if (!canOmit) {
    return "required";
  }
  return omitted ? "omitted" : "omittable";
}

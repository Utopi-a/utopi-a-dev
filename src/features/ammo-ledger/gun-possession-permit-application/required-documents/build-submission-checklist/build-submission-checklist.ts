import type { ApplicationPrintSection } from "@/features/ammo-ledger/acquisition-permit-application/print-application-section/print-application-section";
import type { GunPermitApplicationInput } from "../../gun-possession-permit-application-types";
import { buildRequiredDocuments } from "../build-required-documents/build-required-documents";

export type SubmissionChecklistCategory = "in_app" | "external" | "present";

export type InAppReadiness = "ready" | "partial" | "not_needed" | "unsupported";

export type SubmissionChecklistItem = {
  id: string;
  label: string;
  description: string;
  category: SubmissionChecklistCategory;
  requirement: "required" | "omittable" | "omitted";
  readiness?: InAppReadiness;
  printSection?: ApplicationPrintSection;
  readinessNote?: string;
  note?: string;
};

export function buildSubmissionChecklist({
  input,
}: {
  input: GunPermitApplicationInput;
}): SubmissionChecklistItem[] {
  const requiredDocuments = buildRequiredDocuments({
    input: {
      kind: input.kind,
      hasExistingPermit: input.hasExistingPermit,
      existingPermitSubmittedToSamePrefecture: input.existingPermitSubmittedToSamePrefecture,
      issuesNewPermitCard: input.issuesNewPermitCard,
      isAge75OrOlder: input.isAge75OrOlder,
      omitCohabitantForm: input.omitCohabitantForm,
      omitResidentRecord: input.omitResidentRecord,
      omitResume: input.omitResume,
    },
  });

  return requiredDocuments.map((doc) => {
    const requirement = doc.status;
    const base = {
      id: doc.id,
      label: doc.label,
      description: doc.description,
      requirement,
      note: doc.note,
    };

    if (doc.source === "generated") {
      return {
        ...base,
        category: "in_app" as const,
        ...resolveInAppReadiness({ id: doc.id, input, requirement }),
      };
    }

    if (doc.source === "present_only") {
      return {
        ...base,
        category: "present" as const,
      };
    }

    return {
      ...base,
      category: "external" as const,
    };
  });
}

function resolveInAppReadiness({
  id,
  input,
  requirement,
}: {
  id: string;
  input: GunPermitApplicationInput;
  requirement: SubmissionChecklistItem["requirement"];
}): Pick<SubmissionChecklistItem, "readiness" | "printSection" | "readinessNote"> {
  if (requirement === "omitted") {
    return { readiness: "not_needed", readinessNote: "省略予定" };
  }

  switch (id) {
    case "form6":
    case "form9":
      return {
        readiness: isMainFormReady({ input }) ? "ready" : "partial",
        printSection: "main",
        readinessNote: isMainFormReady({ input })
          ? "印刷プレビューで出力できます"
          : "氏名・住所・申請銃の入力を確認してください",
      };
    case "resume":
      return resolveResumeReadiness({ input, requirement });
    case "cohabitant":
      return resolveCohabitantReadiness({ input, requirement });
    case "transfer_consent":
      return resolveTransferConsentReadiness({ input });
    case "usage_record":
      return {
        readiness: "unsupported",
        readinessNote: "帳簿連携は未実装です（手書きまたは別途用意）",
      };
    default:
      return { readiness: "unsupported" };
  }
}

function isMainFormReady({ input }: { input: GunPermitApplicationInput }): boolean {
  if (!input.prefectureName.trim() || !input.ownerName.trim() || !input.ownerAddress.trim()) {
    return false;
  }

  return input.guns.every((gun) => gun.gunType.trim() && gun.model.trim() && gun.gunNumber.trim());
}

function resolveResumeReadiness({
  input,
  requirement,
}: {
  input: GunPermitApplicationInput;
  requirement: SubmissionChecklistItem["requirement"];
}): Pick<SubmissionChecklistItem, "readiness" | "printSection" | "readinessNote"> {
  const hasContent =
    (input.resume?.workHistory.length ?? 0) > 0 || (input.resume?.addressHistory.length ?? 0) > 0;

  if (hasContent) {
    return {
      readiness: "ready",
      printSection: "resume",
      readinessNote: "経歴書を印刷できます",
    };
  }

  return {
    readiness: requirement === "required" ? "partial" : "partial",
    printSection: "resume",
    readinessNote: "職歴または住所歴を入力してください",
  };
}

function resolveCohabitantReadiness({
  input,
  requirement,
}: {
  input: GunPermitApplicationInput;
  requirement: SubmissionChecklistItem["requirement"];
}): Pick<SubmissionChecklistItem, "readiness" | "printSection" | "readinessNote"> {
  if (!input.hasCohabitants) {
    return {
      readiness: "not_needed",
      readinessNote: "同居人なし",
    };
  }

  const hasContent = (input.cohabitants?.length ?? 0) > 0;

  if (hasContent) {
    return {
      readiness: "ready",
      printSection: "cohabitants",
      readinessNote: "同居親族書を印刷できます",
    };
  }

  return {
    readiness: requirement === "required" ? "partial" : "partial",
    printSection: "cohabitants",
    readinessNote: "同居親族の氏名・続柄を入力してください",
  };
}

function resolveTransferConsentReadiness({
  input,
}: {
  input: GunPermitApplicationInput;
}): Pick<SubmissionChecklistItem, "readiness" | "printSection" | "readinessNote"> {
  const allSameAsConsent = input.guns.every((gun) => gun.sameAsTransferConsent);
  const allTransferorFilled = input.guns.every(
    (gun) =>
      gun.sameAsTransferConsent || (gun.transferorName?.trim() && gun.transferorAddress?.trim()),
  );

  if (allSameAsConsent) {
    return {
      readiness: "ready",
      printSection: "supplement",
      readinessNote: "別紙に「譲渡等承諾書の通り」と記載済み。第12号の別添は不要",
    };
  }

  if (allTransferorFilled) {
    return {
      readiness: "partial",
      printSection: "supplement",
      readinessNote:
        "別紙に譲渡人情報を記載済み。譲渡人が第12号を別途作成するか、別紙で「承諾書の通り」にチェック",
    };
  }

  return {
    readiness: "partial",
    printSection: "supplement",
    readinessNote: "各申請銃で譲渡人情報を入力するか、「譲渡等承諾書の通り」にチェックしてください",
  };
}

export function summarizeSubmissionChecklist({
  items,
  checkedExternalIds,
}: {
  items: SubmissionChecklistItem[];
  checkedExternalIds: Set<string>;
}): {
  inAppReady: number;
  inAppTotal: number;
  externalReady: number;
  externalTotal: number;
} {
  const inAppItems = items.filter(
    (item) => item.category === "in_app" && item.requirement !== "omitted",
  );
  const externalItems = items.filter(
    (item) => item.category === "external" || item.category === "present",
  );

  const inAppReady = inAppItems.filter(
    (item) => item.readiness === "ready" || item.readiness === "not_needed",
  ).length;
  const externalReady = externalItems.filter((item) => checkedExternalIds.has(item.id)).length;

  return {
    inAppReady,
    inAppTotal: inAppItems.length,
    externalReady,
    externalTotal: externalItems.length,
  };
}

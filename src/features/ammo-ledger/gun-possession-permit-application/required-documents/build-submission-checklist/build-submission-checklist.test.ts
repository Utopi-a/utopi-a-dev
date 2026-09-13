import { describe, expect, it } from "vitest";
import {
  buildSubmissionChecklist,
  summarizeSubmissionChecklist,
} from "./build-submission-checklist";

const baseInput = {
  kind: "new" as const,
  prefectureName: "北海道",
  applicationDate: "2026-06-09",
  ownerName: "山田太郎",
  ownerAddress: "札幌市中央区",
  applicationCount: 1,
  guns: [
    {
      gunCategory: "shotgun" as const,
      gunType: "散弾銃",
      model: "単身ボルト式",
      gunNumber: "12345",
      purpose: "hunting" as const,
      sameAsTransferConsent: true,
    },
  ],
  hasExistingPermit: false,
  existingPermitSubmittedToSamePrefecture: false,
  issuesNewPermitCard: true,
  isAge75OrOlder: false,
  hasCohabitants: false,
  pledgeDisqualification: true,
};

describe("buildSubmissionChecklist", () => {
  it("アプリ作成書類と外部書類に分類する", () => {
    const items = buildSubmissionChecklist({ input: baseInput });

    expect(items.find((item) => item.id === "form6")?.category).toBe("in_app");
    expect(items.find((item) => item.id === "diagnosis")?.category).toBe("external");
    expect(items.find((item) => item.id === "lecture_certificate")?.category).toBe("present");
  });

  it("譲渡承諾書の通りチェック時は作成済みになる", () => {
    const items = buildSubmissionChecklist({ input: baseInput });
    const transferConsent = items.find((item) => item.id === "transfer_consent");

    expect(transferConsent?.readiness).toBe("ready");
    expect(transferConsent?.readinessNote).toContain("第12号の別添は不要");
  });

  it("進捗サマリーを集計する", () => {
    const items = buildSubmissionChecklist({ input: baseInput });
    const summary = summarizeSubmissionChecklist({
      items,
      checkedExternalIds: new Set(["diagnosis"]),
    });

    expect(summary.inAppTotal).toBeGreaterThan(0);
    expect(summary.externalTotal).toBeGreaterThan(summary.externalReady);
    expect(summary.externalReady).toBe(1);
  });
});

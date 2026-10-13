import { describe, expect, it } from "vitest";
import { buildRequiredDocuments } from "./build-required-documents";

describe("buildRequiredDocuments", () => {
  it("新規申請では第6号と教習関連書類を要求する", () => {
    const items = buildRequiredDocuments({
      input: {
        kind: "new",
        hasExistingPermit: false,
        existingPermitSubmittedToSamePrefecture: false,
        issuesNewPermitCard: true,
        isAge75OrOlder: false,
      },
    });

    expect(items.find((item) => item.id === "form6")?.status).toBe("required");
    expect(items.find((item) => item.id === "form9")).toBeUndefined();
    expect(items.find((item) => item.id === "lecture_application")?.status).toBe("required");
    expect(items.find((item) => item.id === "skill_lecture_certificate")?.status).toBe("omittable");
  });

  it("更新申請では第9号と使用実績報告書を要求する", () => {
    const items = buildRequiredDocuments({
      input: {
        kind: "renewal",
        hasExistingPermit: true,
        existingPermitSubmittedToSamePrefecture: true,
        issuesNewPermitCard: false,
        isAge75OrOlder: false,
      },
    });

    expect(items.find((item) => item.id === "form9")?.status).toBe("required");
    expect(items.find((item) => item.id === "form6")).toBeUndefined();
    expect(items.find((item) => item.id === "usage_record")?.status).toBe("required");
    expect(items.find((item) => item.id === "photo")?.status).toBe("omittable");
  });

  it("追加申請で同一公安委員会なら経歴書等を省略可能にする", () => {
    const items = buildRequiredDocuments({
      input: {
        kind: "addition",
        hasExistingPermit: true,
        existingPermitSubmittedToSamePrefecture: true,
        issuesNewPermitCard: false,
        isAge75OrOlder: false,
        omitResume: true,
        omitCohabitantForm: true,
        omitResidentRecord: true,
      },
    });

    expect(items.find((item) => item.id === "resume")?.status).toBe("omitted");
    expect(items.find((item) => item.id === "cohabitant")?.status).toBe("omitted");
    expect(items.find((item) => item.id === "resident_record")?.status).toBe("omitted");
  });

  it("75歳以上は認知機能検査を追加する", () => {
    const items = buildRequiredDocuments({
      input: {
        kind: "renewal",
        hasExistingPermit: true,
        existingPermitSubmittedToSamePrefecture: true,
        issuesNewPermitCard: true,
        isAge75OrOlder: true,
      },
    });

    expect(items.find((item) => item.id === "cognitive_exam")?.status).toBe("required");
  });
});

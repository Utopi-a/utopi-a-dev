import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ApplicationFormDraft,
  applicationFormDraftKey,
  clearApplicationFormDraft,
  loadApplicationFormDraft,
  saveApplicationFormDraft,
} from "./application-form-draft";

const draft: ApplicationFormDraft = {
  prefectureName: "茨城県",
  applicationDate: "2026-09-10",
  ownerName: "テスト氏名",
  ownerFurigana: "てすと しめい",
  ownerAddress: "茨城県テスト市1-1",
  ownerBirthDate: "1990-01-01",
  ownerPhone: "000-0000-0000",
  possessionPermitCertificateNumber: "00123456789",
  ammoName: "20番",
  permitPurpose: "標的射撃",
  requestedQuantity: "750",
  homeStock: "120",
  validFrom: "2026-09-10",
  validTo: "2027-09-09",
  storageLocation: "ガンロッカー",
  selectedGunIds: ["gun-a", "gun-b"],
  counterparty: { id: "shop-1", name: "テスト銃砲店", address: "テスト所在地" },
  rangeAllocationRows: [
    { id: "row-1", rangeId: "range-1", rangeName: "テスト射撃場", rangeAddress: "", weight: "2" },
  ],
  planInputKey: null,
};

describe("申請書の入力下書き", () => {
  beforeEach(() => sessionStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  it("保存した下書きをそのまま読み戻し、消すと読めなくなる", () => {
    saveApplicationFormDraft({ draft });
    expect(loadApplicationFormDraft()).toEqual(draft);

    clearApplicationFormDraft();
    expect(loadApplicationFormDraft()).toBeNull();
  });

  it("端末に長く残さないよう localStorage には書かない", () => {
    saveApplicationFormDraft({ draft });
    expect(localStorage.getItem(applicationFormDraftKey)).toBeNull();
  });

  it.each([
    ["JSON として壊れた値", "{"],
    ["申請書で選べない名称", JSON.stringify({ ...draft, ammoName: "空包" })],
    ["項目が欠けた値", JSON.stringify({ ...draft, rangeAllocationRows: undefined })],
  ])("%sは無視する", (_label, raw) => {
    sessionStorage.setItem(applicationFormDraftKey, raw);
    expect(loadApplicationFormDraft()).toBeNull();
  });

  it("ストレージが使えなくても例外を出さない", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => saveApplicationFormDraft({ draft })).not.toThrow();
    expect(loadApplicationFormDraft()).toBeNull();
  });
});

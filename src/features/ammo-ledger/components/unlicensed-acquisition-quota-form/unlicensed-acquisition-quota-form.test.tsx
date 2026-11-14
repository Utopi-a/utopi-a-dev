import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createUnlicensedAcquisitionQuotaAction } from "@/features/ammo-ledger/permit/create-unlicensed-acquisition-quota/create-unlicensed-acquisition-quota-action";
import { UnlicensedAcquisitionQuotaForm } from "./unlicensed-acquisition-quota-form";

const navigateAfterMutation = vi.fn();

vi.mock(
  "@/features/ammo-ledger/navigation/use-ammo-ledger-mutation-navigation/use-ammo-ledger-mutation-navigation",
  () => ({ useAmmoLedgerMutationNavigation: () => navigateAfterMutation }),
);

vi.mock("@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast", () => ({
  showAmmoLedgerToast: vi.fn(),
}));

vi.mock(
  "@/features/ammo-ledger/permit/create-unlicensed-acquisition-quota/create-unlicensed-acquisition-quota-action",
  () => ({ createUnlicensedAcquisitionQuotaAction: vi.fn() }),
);

vi.mock("@/lib/date/get-tokyo-iso-date", () => ({
  getTokyoIsoDate: () => "2026-11-14",
}));

describe("UnlicensedAcquisitionQuotaForm", () => {
  beforeEach(() => {
    vi.mocked(createUnlicensedAcquisitionQuotaAction).mockReset();
    navigateAfterMutation.mockReset();
  });

  it("狩猟者登録の期間を猟期で初期化し、登録したら狩猟用の帳簿へ戻る", async () => {
    vi.mocked(createUnlicensedAcquisitionQuotaAction).mockResolvedValue({ ok: true });
    render(<UnlicensedAcquisitionQuotaForm />);

    expect(screen.getByLabelText("狩猟者登録の有効期間（から）")).toHaveValue("2026/10/15");
    expect(screen.getByLabelText("（まで）")).toHaveValue("2027/04/15");

    fireEvent.click(screen.getByRole("button", { name: "枠を登録" }));

    await waitFor(() =>
      expect(createUnlicensedAcquisitionQuotaAction).toHaveBeenCalledWith({
        ledgerPurpose: "hunting",
        startsOn: "2026-10-15",
        endsOn: "2027-04-15",
        memo: undefined,
      }),
    );
    expect(navigateAfterMutation).toHaveBeenCalledWith({
      href: expect.stringContaining("hunting"),
    });
  });

  it("有害鳥獣駆除に切り替えると捕獲許可の期間として入れ直す", () => {
    render(<UnlicensedAcquisitionQuotaForm />);

    fireEvent.change(screen.getByLabelText("用途区分"), { target: { value: "pest_control" } });

    expect(screen.getByLabelText("鳥獣の捕獲許可の有効期間（から）")).toHaveValue("2026/11/14");
    expect(screen.getByLabelText("（まで）")).toHaveValue("2027/11/13");
  });

  it("保存に失敗したら理由を示し、画面を離れない", async () => {
    vi.mocked(createUnlicensedAcquisitionQuotaAction).mockResolvedValue({
      ok: false,
      error: "入力内容を確認してください",
    });
    render(<UnlicensedAcquisitionQuotaForm />);

    fireEvent.click(screen.getByRole("button", { name: "枠を登録" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("入力内容を確認してください");
    expect(navigateAfterMutation).not.toHaveBeenCalled();
  });
});

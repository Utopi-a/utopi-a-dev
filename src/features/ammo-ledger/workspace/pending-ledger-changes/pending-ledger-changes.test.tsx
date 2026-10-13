import { act, render, screen, within } from "@testing-library/react";
import { Toaster, toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unauthenticatedMutationResult } from "@/features/ammo-ledger/auth/unauthenticated-mutation-result/unauthenticated-mutation-result";
import { PendingLedgerChangeAlerts } from "@/features/ammo-ledger/components/pending-ledger-change-alerts/pending-ledger-change-alerts";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import {
  type PendingLedgerActionResult,
  useRunPendingLedgerChange,
} from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

function SaveButton({ action }: { action: () => Promise<PendingLedgerActionResult> }) {
  const runPendingChange = useRunPendingLedgerChange();
  return (
    <button
      type="button"
      onClick={() =>
        runPendingChange({
          overlay: { upserted: [], removedIds: [] },
          summary: "消費記録",
          restore: {
            formKey: "consume",
            href: "/lab/ammo-ledger/consume/new",
            values: { looseRounds: 3 },
          },
          action,
        })
      }
    >
      保存
    </button>
  );
}

function renderLedger({ action }: { action: () => Promise<PendingLedgerActionResult> }) {
  return render(
    <AmmoLedgerSwrProvider>
      <Toaster />
      <PendingLedgerChangeAlerts />
      <SaveButton action={action} />
    </AmmoLedgerSwrProvider>,
  );
}

describe("useRunPendingLedgerChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/lab/ammo-ledger/ledger");
    // 失敗後の帳簿の取り直しは保留させる。
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
  });

  afterEach(() => {
    toast.dismiss();
    vi.restoreAllMocks();
  });

  it("ログインが切れて保存できなかった記録は、このタブを移動させず別のタブでのログインと入力に戻る導線を出す", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    renderLedger({ action: async () => unauthenticatedMutationResult() });

    await act(async () => screen.getByRole("button", { name: "保存" }).click());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("消費記録を保存できませんでした");
    expect(alert).toHaveTextContent("ログインの有効期限が切れました");
    expect(alert).toHaveTextContent("入力内容はこのタブに残っています");
    const loginLink = within(alert).getByRole("link", { name: "別のタブでログインする" });
    expect(loginLink).toHaveAttribute("href", "/login?next=%2Flab%2Fammo-ledger%2Fledger");
    expect(loginLink).toHaveAttribute("target", "_blank");
    expect(loginLink.getAttribute("rel")).toContain("noopener");
    expect(within(alert).getByRole("link", { name: "入力に戻る" }).getAttribute("href")).toMatch(
      /^\/lab\/ammo-ledger\/consume\/new\?restore=/,
    );

    await act(async () => screen.getByRole("button", { name: "別のタブでログイン" }).click());
    expect(open).toHaveBeenCalledWith(
      "/login?next=%2Flab%2Fammo-ledger%2Fledger",
      "_blank",
      "noopener",
    );
    expect(push).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/lab/ammo-ledger/ledger");
  });

  it("ログイン以外の理由で保存できなかったときはログインの導線を出さない", async () => {
    renderLedger({ action: async () => ({ ok: false, error: "射撃場が見つかりません" }) });

    await act(async () => screen.getByRole("button", { name: "保存" }).click());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("射撃場が見つかりません");
    expect(within(alert).queryByRole("link", { name: /ログイン/ })).not.toBeInTheDocument();
    expect(within(alert).getByRole("link", { name: "入力に戻る" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "入力に戻る" })).toBeInTheDocument();
  });
});

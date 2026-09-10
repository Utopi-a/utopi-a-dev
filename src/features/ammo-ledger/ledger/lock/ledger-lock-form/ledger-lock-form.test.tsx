import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lockLedgerAction } from "@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action";
import type { LedgerLockState } from "@/features/ammo-ledger/ledger/lock/lock-state-types";
import { unlockLedgerAction } from "@/features/ammo-ledger/ledger/lock/unlock-ledger-action/unlock-ledger-action";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { LedgerLockForm } from "./ledger-lock-form";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/features/ammo-ledger/ledger/lock/lock-ledger-action/lock-ledger-action", () => ({
  lockLedgerAction: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/ledger/lock/unlock-ledger-action/unlock-ledger-action", () => ({
  unlockLedgerAction: vi.fn(),
}));

function WorkspaceLockStatus() {
  const { workspace } = useAmmoLedgerWorkspace();
  return <p>帳簿画面: {workspace?.lockState.lockedThrough ?? "編集可能"}</p>;
}

function renderForm({ lockState }: { lockState: LedgerLockState }) {
  const payload: AmmoLedgerWorkspacePayload = {
    ownerName: "テスト利用者",
    workspace: {
      entries: [],
      permitEvents: [],
      permits: [],
      profile: null,
      inventoryItems: [],
      guns: [],
      lockState,
    },
  };
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={payload}>
      <WorkspaceLockStatus />
      <LedgerLockForm lockState={lockState} events={[]} />
    </AmmoLedgerSwrProvider>,
  );
}

describe("LedgerLockForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-01T03:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("unexpected fetch"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("ロック通信に失敗してもエラーを表示し、再操作できる", async () => {
    vi.mocked(lockLedgerAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderForm({ lockState: { isLocked: false, lockedThrough: null } });
    fireEvent.click(screen.getByRole("button", { name: "ロックする" }));

    expect(await screen.findByText(/帳簿のロック結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByRole("button", { name: "ロックする" })).toBeEnabled();
    expect(screen.getByText("帳簿画面: 編集可能")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("ロック成功後は帳簿画面にも確定した日付を反映する", async () => {
    vi.mocked(lockLedgerAction).mockResolvedValueOnce({
      ok: true,
      lockState: { isLocked: true, lockedThrough: "2026-09-01" },
    });
    renderForm({ lockState: { isLocked: false, lockedThrough: null } });
    fireEvent.click(screen.getByRole("button", { name: "ロックする" }));

    expect(await screen.findByText("帳簿画面: 2026-09-01")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("解除通信に失敗してもエラーを表示し、解除を再操作できる", async () => {
    vi.mocked(unlockLedgerAction).mockRejectedValueOnce(new Error("network unavailable"));
    renderForm({ lockState: { isLocked: true, lockedThrough: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "ロックを解除する…" }));
    fireEvent.click(screen.getByRole("button", { name: "解除する" }));

    expect(await screen.findByText(/帳簿のロック解除結果を確認できませんでした/)).toBeVisible();
    expect(screen.getByRole("button", { name: "解除する" })).toBeEnabled();
    expect(screen.getByText("帳簿画面: 2026-09-01")).toBeVisible();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("解除成功後は帳簿画面のロックを即座に解除する", async () => {
    vi.mocked(unlockLedgerAction).mockResolvedValueOnce({
      ok: true,
      lockState: { isLocked: false, lockedThrough: null },
    });
    renderForm({ lockState: { isLocked: true, lockedThrough: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "ロックを解除する…" }));
    fireEvent.click(screen.getByRole("button", { name: "解除する" }));

    expect(await screen.findByText("帳簿画面: 編集可能")).toBeVisible();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(refresh).not.toHaveBeenCalled();
  });
});

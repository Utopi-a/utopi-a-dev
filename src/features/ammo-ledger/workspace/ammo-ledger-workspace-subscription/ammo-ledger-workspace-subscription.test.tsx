import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PathnameContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { AmmoLedgerWorkspaceSubscription } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-subscription/ammo-ledger-workspace-subscription";
import {
  useAmmoLedgerWorkspace,
  useRequestAmmoLedgerWorkspaceRevalidation,
  workspaceStaleMs,
} from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

const initialWorkspace: AmmoLedgerWorkspacePayload = {
  ownerName: "保存前の所有者",
  workspace: {
    entries: [],
    permitEvents: [],
    permits: [],
    profile: null,
    inventoryItems: [],
    guns: [],
    lockState: { isLocked: false, lockedThrough: null },
  },
};

function WorkspaceView() {
  const { ownerName, workspace } = useAmmoLedgerWorkspace();
  return (
    <div>
      <p>{ownerName}</p>
      <p>
        {workspace?.lockState.isLocked
          ? `${workspace.lockState.lockedThrough}まで確定済み`
          : "未確定"}
      </p>
    </div>
  );
}

function SettingsView() {
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  const [showWorkspace, setShowWorkspace] = useState(false);
  return (
    <div>
      <button type="button" onClick={requestRevalidation}>
        保存後の表示を更新
      </button>
      <button type="button" onClick={() => setShowWorkspace(true)}>
        帳簿を開く
      </button>
      {showWorkspace ? <WorkspaceView /> : null}
    </div>
  );
}

function renderWorkspace({ settingsOnly = false }: { settingsOnly?: boolean } = {}) {
  return render(
    <PathnameContext.Provider value="/lab/ammo-ledger/settings/profile">
      <AmmoLedgerSwrProvider initialWorkspace={initialWorkspace}>
        <AmmoLedgerWorkspaceSubscription />
        {settingsOnly ? <SettingsView /> : <WorkspaceView />}
      </AmmoLedgerSwrProvider>
    </PathnameContext.Provider>,
  );
}

async function settleAnimationFrame() {
  await act(async () => {
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  });
}

describe("AmmoLedgerWorkspaceSubscription with the real SWR provider", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("SSRの初期データをそのまま表示し、購読と表示のmountでGETを重複実行しない", async () => {
    renderWorkspace();
    expect(screen.getByText("保存前の所有者")).toBeVisible();
    expect(screen.getByText("未確定")).toBeVisible();

    await settleAnimationFrame();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("workspace表示のない設定画面でも、保存後の再検証でcacheを更新する", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ ...initialWorkspace, ownerName: "保存後の所有者" })),
    );
    renderWorkspace({ settingsOnly: true });
    await settleAnimationFrame();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("保存前の所有者")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存後の表示を更新" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "帳簿を開く" }));

    expect(await screen.findByText("保存後の所有者")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/ammo-ledger/workspace",
      expect.objectContaining({ cache: "no-store" }),
    );
    await settleAnimationFrame();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("30秒後のfocusで他画面の最新ロック状態を取り込み、連続focusでは取得を重ねない", async () => {
    const initialTime = Date.parse("2026-09-10T00:00:00.000Z");
    const now = vi.spyOn(Date, "now").mockReturnValue(initialTime);
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...initialWorkspace,
          workspace: {
            ...initialWorkspace.workspace,
            lockState: { isLocked: true, lockedThrough: "2026-09-10" },
          },
        }),
      ),
    );
    renderWorkspace();
    expect(screen.getByText("未確定")).toBeVisible();
    await settleAnimationFrame();
    expect(fetchMock).not.toHaveBeenCalled();

    now.mockReturnValue(initialTime + workspaceStaleMs + 1_000);
    fireEvent.focus(window);

    expect(await screen.findByText("2026-09-10まで確定済み")).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fireEvent.focus(window);
    await settleAnimationFrame();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

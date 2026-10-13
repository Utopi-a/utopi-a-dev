import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useSWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspacePayload } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-payload/ammo-ledger-workspace-payload";
import { ammoLedgerWorkspaceQueryKey } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-query-key/ammo-ledger-workspace-query-key";
import { AmmoLedgerRefreshError, AmmoLedgerRefreshStatus } from "./ammo-ledger-refresh-indicator";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lab/ammo-ledger/ledger",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const payload: AmmoLedgerWorkspacePayload = {
  ownerName: "テスト利用者",
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

function RevalidateButton() {
  const { mutate } = useSWRConfig();
  return (
    <button type="button" onClick={() => void mutate(ammoLedgerWorkspaceQueryKey).catch(() => {})}>
      帳簿を取り直す
    </button>
  );
}

function renderIndicators({ initialWorkspace }: { initialWorkspace?: AmmoLedgerWorkspacePayload }) {
  render(
    <AmmoLedgerSwrProvider initialWorkspace={initialWorkspace}>
      <AmmoLedgerRefreshStatus />
      <AmmoLedgerRefreshError />
      <RevalidateButton />
    </AmmoLedgerSwrProvider>,
  );
}

describe("帳簿の更新中・失敗の表示", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("取り直している間は更新中を示し、終わると消す", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(new Promise((resolve) => (respond = resolve)));
    renderIndicators({ initialWorkspace: payload });

    fireEvent.click(screen.getByRole("button", { name: "帳簿を取り直す" }));

    expect(await screen.findByRole("status")).toHaveTextContent("帳簿を更新中…");
    respond(Response.json(payload));
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
  });

  it("表示済みの帳簿を取り直せないと上部で知らせ、再試行で復旧する", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderIndicators({ initialWorkspace: payload });

    fireEvent.click(screen.getByRole("button", { name: "帳簿を取り直す" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("帳簿の表示を更新できませんでした");

    fetchMock.mockResolvedValueOnce(Response.json(payload));
    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("一度も取得できていないときは画面のローダーに任せて重ねて出さない", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderIndicators({});

    fireEvent.click(screen.getByRole("button", { name: "帳簿を取り直す" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerLoginRequiredError } from "@/features/ammo-ledger/workspace/fetch-ammo-ledger-workspace/fetch-ammo-ledger-workspace";
import { WorkspaceViewLoader } from "./workspace-view-loader";

vi.mock("next/navigation", () => ({
  usePathname: () => "/lab/ammo-ledger/consume/new",
}));

describe("WorkspaceViewLoader", () => {
  it("ログインが切れたときは再試行ではなく、今の画面に戻るログインへ案内する", () => {
    const onRetry = vi.fn();
    render(<WorkspaceViewLoader error={new AmmoLedgerLoginRequiredError()} onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("再度ログインしてください");
    expect(screen.getByRole("link", { name: "ログイン画面へ" })).toHaveAttribute(
      "href",
      "/login?next=%2Flab%2Fammo-ledger%2Fconsume%2Fnew",
    );
    expect(screen.queryByRole("button", { name: "再試行" })).not.toBeInTheDocument();
  });

  it("通信の失敗では再試行を出し、ログインへは案内しない", () => {
    const onRetry = vi.fn();
    render(
      <WorkspaceViewLoader
        error={new Error("帳簿データを取得できませんでした。")}
        onRetry={onRetry}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "再試行" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("link", { name: "ログイン画面へ" })).not.toBeInTheDocument();
  });
});

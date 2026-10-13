import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { buildTestWorkspace } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { ConsumeNewView } from "./consume-new-view";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock(
  "@/features/ammo-ledger/transactions/get-draft/use-draft-transaction/use-draft-transaction",
  () => ({
    useDraftTransaction: () => ({
      draft: null,
      isLoading: false,
      error: undefined,
      retry: vi.fn(),
    }),
  }),
);

vi.mock("@/features/ammo-ledger/components/consume-form/consume-form", () => ({
  ConsumeForm: () => <p>消費フォーム</p>,
}));

function renderConsume({ workspace }: { workspace: AmmoLedgerWorkspace }) {
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={{ ownerName: "架空 太郎", workspace }}>
      <ConsumeNewView />
    </AmmoLedgerSwrProvider>,
  );
}

describe("ConsumeNewView の登録不足の案内", () => {
  it("銃だけがなければ、銃の登録だけを案内して消費の入力に戻れるリンクにする", () => {
    renderConsume({ workspace: buildTestWorkspace({ guns: [] }) });

    expect(screen.getByText("消費を記録するには、銃の登録が必要です。")).toBeVisible();
    expect(screen.getByRole("link", { name: "銃を登録する" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/guns?returnTo=%2Flab%2Fammo-ledger%2Fconsume%2Fnew",
    );
    expect(screen.queryByRole("link", { name: "弾種を登録する" })).toBeNull();
    expect(screen.queryByText("消費フォーム")).toBeNull();
  });

  it("銃と弾種がそろっていれば入力フォームを出す", () => {
    renderConsume({ workspace: buildTestWorkspace() });

    expect(screen.getByText("消費フォーム")).toBeVisible();
    expect(screen.queryByRole("link", { name: /を登録する/ })).toBeNull();
  });
});

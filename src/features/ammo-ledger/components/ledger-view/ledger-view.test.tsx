import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import {
  buildTestEntry,
  buildTestWorkspace,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { LedgerView } from "./ledger-view";

const { browserLocation, push } = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  return {
    push: vi.fn(),
    browserLocation: {
      subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      notify() {
        for (const listener of listeners) listener();
      },
    },
  };
});

// Next.js の useSearchParams と同じく、history の書き換えで再描画させる。
vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useRouter: () => ({ push, refresh: vi.fn() }),
    usePathname: () => window.location.pathname,
    useSearchParams: () =>
      new URLSearchParams(
        useSyncExternalStore(browserLocation.subscribe, () => window.location.search),
      ),
  };
});

vi.mock("@/features/ammo-ledger/transactions/void-ledger-entry/void-ledger-entry-action", () => ({
  voidLedgerEntryAction: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/transactions/reorder-ledger-entry/reorder-ledger-entry-action",
  () => ({ reorderLedgerEntryAction: vi.fn() }),
);

const entries = [
  buildTestEntry({
    id: "carryover-2025",
    category: "carryover",
    occurredOn: "2025-01-01",
    quantity: 100,
  }),
  buildTestEntry({
    id: "consume-2025",
    category: "consume",
    occurredOn: "2025-06-15",
    quantity: 10,
  }),
  buildTestEntry({
    id: "consume-2026",
    category: "consume",
    occurredOn: "2026-04-01",
    quantity: 20,
  }),
  buildTestEntry({
    id: "hunting-2026",
    category: "acquire",
    purpose: "hunting",
    occurredOn: "2026-05-01",
    quantity: 50,
  }),
];

function renderLedgerView({
  search,
  workspace = buildTestWorkspace({ entries }),
}: {
  search: string;
  workspace?: AmmoLedgerWorkspace;
}) {
  window.history.replaceState(null, "", `/lab/ammo-ledger/ledger${search}`);
  return render(
    <AmmoLedgerSwrProvider initialWorkspace={{ ownerName: "テスト利用者", workspace }}>
      <LedgerView />
    </AmmoLedgerSwrProvider>,
  );
}

function shownEntryIds() {
  const table = screen.getByRole("table");
  return [...table.querySelectorAll("[data-ledger-entry-id]")].map((row) =>
    row.getAttribute("data-ledger-entry-id"),
  );
}

describe("LedgerView", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-13T03:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise(() => {}));
    Object.defineProperty(window.HTMLElement.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
    const replaceState = window.history.replaceState.bind(window.history);
    vi.spyOn(window.history, "replaceState").mockImplementation((...args) => {
      replaceState(...args);
      browserLocation.notify();
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Reflect.deleteProperty(window.HTMLElement.prototype, "scrollIntoView");
  });

  it("年の指定がなければ今年の記録だけを表示し、件数も今年の分を数える", () => {
    renderLedgerView({ search: "?purpose=shooting" });

    expect(shownEntryIds()).toEqual(["consume-2026"]);
    expect(screen.getByRole("button", { name: "射撃用 1件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "狩猟用 1件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2026年を印刷する →" })).toBeInTheDocument();
  });

  it("年を選ぶとその年の記録を表示し、印刷も同じ年にする", () => {
    renderLedgerView({ search: "?purpose=shooting" });

    fireEvent.change(screen.getByLabelText("対象年"), { target: { value: "2025" } });

    expect(new URLSearchParams(window.location.search).get("year")).toBe("2025");
    expect(shownEntryIds()).toEqual(["carryover-2025", "consume-2025"]);
    fireEvent.click(screen.getByRole("button", { name: "2025年を印刷する →" }));
    expect(push).toHaveBeenCalledWith("/lab/ammo-ledger/ledger/print?year=2025");
  });

  it("空の選択肢を選んでも年を変えない", () => {
    renderLedgerView({ search: "?purpose=shooting&year=2025" });

    fireEvent.change(screen.getByLabelText("対象年"), { target: { value: "" } });

    expect(screen.getByRole("button", { name: "2025年を印刷する →" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^0年/ })).not.toBeInTheDocument();
  });

  it("用途を切り替えても選んだ年を保つ", () => {
    renderLedgerView({ search: "?purpose=shooting&year=2025" });

    fireEvent.click(screen.getByRole("button", { name: "狩猟用 0件" }));

    const params = new URLSearchParams(window.location.search);
    expect(params.get("purpose")).toBe("hunting");
    expect(params.get("year")).toBe("2025");
  });

  it("保存直後の記録を指定して開いたときは、その記録の年を表示する", () => {
    renderLedgerView({ search: "?purpose=shooting&entry=consume-2025" });

    expect(shownEntryIds()).toEqual(["carryover-2025", "consume-2025"]);
    expect(screen.getByText("保存した記録を強調表示しています。")).toBeInTheDocument();
  });

  it("帳簿残数（全用途）は対象年より前の記録も含めて数える", () => {
    renderLedgerView({ search: "?purpose=shooting" });

    const totalStock = screen.getByText("帳簿残数（全用途）").parentElement as HTMLElement;
    expect(within(totalStock).getByRole("definition")).toHaveTextContent("120個");
  });

  it("確定済みの日付を見出しと行のシートに示し、確定・ロックの設定へ案内する", () => {
    renderLedgerView({
      search: "?purpose=shooting&year=2025",
      workspace: buildTestWorkspace({
        entries,
        lockState: { isLocked: true, lockedThrough: "2025-12-31" },
      }),
    });

    expect(screen.getByRole("link", { name: "2025/12/31 まで確定済み →" })).toHaveAttribute(
      "href",
      "/lab/ammo-ledger/settings/ledger-lock",
    );
    fireEvent.click(within(screen.getByRole("table")).getByText("2025/06/15"));
    const sheet = screen.getByRole("dialog");
    expect(sheet).toHaveTextContent("この期間はロック済みのため編集・取消できません。");
    expect(
      within(sheet).getByRole("link", { name: "2025/12/31 まで確定済み →" }),
    ).toBeInTheDocument();
  });
});

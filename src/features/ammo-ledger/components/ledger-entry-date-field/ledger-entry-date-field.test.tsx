import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerSwrProvider } from "@/features/ammo-ledger/workspace/ammo-ledger-swr-provider/ammo-ledger-swr-provider";
import { buildTestWorkspace } from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { LedgerEntryDateField } from "./ledger-entry-date-field";

describe("LedgerEntryDateField", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("日本時間の今日より後と、ロック済みの期間を選べないようにする", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 日本時間 2026-10-13 00:30（UTC では前日）
    vi.setSystemTime(new Date("2026-10-12T15:30:00Z"));
    const { container } = render(
      <AmmoLedgerSwrProvider
        initialWorkspace={{
          ownerName: "テスト利用者",
          workspace: buildTestWorkspace({
            lockState: { isLocked: true, lockedThrough: "2026-03-31" },
          }),
        }}
      >
        <LedgerEntryDateField id="occurred-on" value="2026-10-13" onChange={() => {}} />
      </AmmoLedgerSwrProvider>,
    );

    const picker = container.querySelector('input[type="date"]');
    expect(picker).toHaveAttribute("min", "2026-04-01");
    expect(picker).toHaveAttribute("max", "2026-10-13");
  });
});

import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmmoLedgerOfflineNotice } from "./ammo-ledger-offline-notice";

function setConnection({ online }: { online: boolean }) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(online);
  act(() => {
    window.dispatchEvent(new Event(online ? "online" : "offline"));
  });
}

describe("AmmoLedgerOfflineNotice", () => {
  afterEach(() => vi.restoreAllMocks());

  it("電波が切れたら保存と表示に電波が必要なことを示し、戻ったら消す", () => {
    render(<AmmoLedgerOfflineNotice />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    setConnection({ online: false });
    expect(screen.getByRole("status")).toHaveTextContent(
      "オフラインです。保存と帳簿の表示には電波が必要です。",
    );

    setConnection({ online: true });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

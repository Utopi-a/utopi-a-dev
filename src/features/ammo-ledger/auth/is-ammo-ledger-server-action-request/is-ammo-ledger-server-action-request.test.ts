import { describe, expect, it } from "vitest";
import { isAmmoLedgerServerActionRequest } from "./is-ammo-ledger-server-action-request";

function actionHeaders() {
  return new Headers({ "next-action": "action-id" });
}

describe("isAmmoLedgerServerActionRequest", () => {
  it("帳簿の画面からの Server Action の POST を判定する", () => {
    expect(
      isAmmoLedgerServerActionRequest({
        pathname: "/lab/ammo-ledger/consume/new",
        method: "POST",
        headers: actionHeaders(),
      }),
    ).toBe(true);
    expect(
      isAmmoLedgerServerActionRequest({
        pathname: "/lab/ammo-ledger",
        method: "POST",
        headers: actionHeaders(),
      }),
    ).toBe(true);
  });

  it("画面の表示や Server Action 以外の POST は対象にしない", () => {
    expect(
      isAmmoLedgerServerActionRequest({
        pathname: "/lab/ammo-ledger/ledger",
        method: "GET",
        headers: actionHeaders(),
      }),
    ).toBe(false);
    expect(
      isAmmoLedgerServerActionRequest({
        pathname: "/lab/ammo-ledger/ledger",
        method: "POST",
        headers: new Headers(),
      }),
    ).toBe(false);
  });

  it("帳簿以外の保護されたページの Server Action は対象にしない", () => {
    for (const pathname of ["/lab/studio", "/lab/settings/profile", "/lab/ammo-ledger-other"]) {
      expect(
        isAmmoLedgerServerActionRequest({ pathname, method: "POST", headers: actionHeaders() }),
      ).toBe(false);
    }
  });
});

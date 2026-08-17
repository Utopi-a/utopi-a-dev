import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDevAmmoAuthBypassEnabled,
  shouldBypassAmmoLedgerAuth,
} from "@/features/ammo-ledger/auth/dev-auth-bypass";

describe("dev ammo auth bypass", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("development かつユーザーメール指定時だけ有効にする", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", "dev@example.com");

    expect(isDevAmmoAuthBypassEnabled()).toBe(true);
  });

  it("production ではユーザーメールがあっても無効にする", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", "dev@example.com");

    expect(isDevAmmoAuthBypassEnabled()).toBe(false);
  });

  it("development でも明示設定がなければ無効にする", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", "");

    expect(isDevAmmoAuthBypassEnabled()).toBe(false);
  });

  it("有効時も ammo-ledger 以外の認証は省略しない", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", "dev@example.com");

    expect(shouldBypassAmmoLedgerAuth({ pathname: "/lab/ammo-ledger/ledger" })).toBe(true);
    expect(shouldBypassAmmoLedgerAuth({ pathname: "/lab/studio" })).toBe(false);
  });
});

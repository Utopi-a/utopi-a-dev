import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDevAmmoAuthBypassEnabled } from "@/features/ammo-ledger/auth/dev-auth-bypass";
import {
  requireAmmoUser,
  resolveAmmoUserForMutation,
} from "@/features/ammo-ledger/auth/require-ammo-user";
import { resolveDevAmmoUser } from "@/features/ammo-ledger/auth/resolve-dev-ammo-user";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { getSession } from "@/features/auth/get-session/get-session";

vi.mock("@/features/auth/get-session/get-session", () => ({
  getSession: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/features/ammo-ledger/auth/dev-auth-bypass", () => ({
  isDevAmmoAuthBypassEnabled: vi.fn(),
}));

vi.mock("@/features/ammo-ledger/auth/resolve-dev-ammo-user", () => ({
  resolveDevAmmoUser: vi.fn(),
}));

vi.mock(
  "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit",
  () => ({
    assertServerActionRateLimit: vi.fn(),
  }),
);

const getSessionMock = vi.mocked(getSession);
const isDevAmmoAuthBypassEnabledMock = vi.mocked(isDevAmmoAuthBypassEnabled);
const resolveDevAmmoUserMock = vi.mocked(resolveDevAmmoUser);
const assertServerActionRateLimitMock = vi.mocked(assertServerActionRateLimit);

const sessionUser = {
  id: "user-1",
  name: "テストユーザー",
  email: "user@example.com",
  emailVerified: true,
  image: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const session = {
  session: {
    id: "session-1",
    userId: sessionUser.id,
    expiresAt: new Date(),
    token: "token",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: sessionUser,
};

beforeEach(() => {
  vi.clearAllMocks();
  isDevAmmoAuthBypassEnabledMock.mockReturnValue(false);
  getSessionMock.mockResolvedValue(session);
  redirectMock.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireAmmoUser", () => {
  it("未ログインなら ammo-ledger へ戻るログイン画面へリダイレクトする", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(requireAmmoUser()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/lab/ammo-ledger");
  });

  it("セッションのユーザーを返す", async () => {
    await expect(requireAmmoUser()).resolves.toEqual(sessionUser);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("開発用バイパス有効時は指定ユーザーを返す", async () => {
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", sessionUser.email);
    isDevAmmoAuthBypassEnabledMock.mockReturnValue(true);
    resolveDevAmmoUserMock.mockResolvedValue(sessionUser);

    await expect(requireAmmoUser()).resolves.toEqual(sessionUser);
    expect(resolveDevAmmoUserMock).toHaveBeenCalledWith({
      email: sessionUser.email,
    });
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  it("rateLimit 指定時はレート制限を消費する", async () => {
    await requireAmmoUser({ rateLimit: "mutation" });

    expect(assertServerActionRateLimitMock).toHaveBeenCalledWith({
      userId: sessionUser.id,
      kind: "mutation",
    });
  });

  it("rateLimit 未指定時はレート制限を消費しない", async () => {
    await requireAmmoUser();

    expect(assertServerActionRateLimitMock).not.toHaveBeenCalled();
  });
});

describe("resolveAmmoUserForMutation", () => {
  it("認証済みならユーザーを返す", async () => {
    await expect(resolveAmmoUserForMutation()).resolves.toEqual({
      ok: true,
      user: sessionUser,
    });
    expect(assertServerActionRateLimitMock).toHaveBeenCalledWith({
      userId: sessionUser.id,
      kind: "mutation",
    });
  });

  it("未ログインならリダイレクトせず、ログインし直しを促す失敗を返す", async () => {
    getSessionMock.mockResolvedValue(null);

    await expect(resolveAmmoUserForMutation()).resolves.toEqual({
      ok: false,
      code: "unauthenticated",
      error: "ログインの有効期限が切れました。ログインし直してから保存してください。",
    });
    expect(redirectMock).not.toHaveBeenCalled();
    expect(assertServerActionRateLimitMock).not.toHaveBeenCalled();
  });

  it("開発用バイパス有効時はセッションなしでも指定ユーザーで保存できる", async () => {
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", sessionUser.email);
    isDevAmmoAuthBypassEnabledMock.mockReturnValue(true);
    resolveDevAmmoUserMock.mockResolvedValue(sessionUser);
    getSessionMock.mockResolvedValue(null);

    await expect(resolveAmmoUserForMutation()).resolves.toEqual({
      ok: true,
      user: sessionUser,
    });
  });

  it("レート制限超過時はエラー結果を返す", async () => {
    assertServerActionRateLimitMock.mockImplementation(() => {
      throw new ServerActionRateLimitError();
    });

    await expect(resolveAmmoUserForMutation()).resolves.toEqual({
      ok: false,
      error: "操作が多すぎます。しばらくしてからお試しください。",
    });
  });

  it("レート制限以外の例外はそのまま投げる", async () => {
    assertServerActionRateLimitMock.mockImplementation(() => {
      throw new Error("unexpected");
    });

    await expect(resolveAmmoUserForMutation()).rejects.toThrow("unexpected");
  });
});

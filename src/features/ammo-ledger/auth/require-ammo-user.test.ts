import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isDevAmmoAuthBypassEnabled } from "@/features/ammo-ledger/auth/dev-auth-bypass";
import {
  requireAmmoUser,
  resolveAmmoUserForMutation,
} from "@/features/ammo-ledger/auth/require-ammo-user";
import { resolveDevAmmoUser } from "@/features/ammo-ledger/auth/resolve-dev-ammo-user";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { requireSession } from "@/features/auth/require-session/require-session";

vi.mock("@/features/auth/require-session/require-session", () => ({
  requireSession: vi.fn(),
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

const requireSessionMock = vi.mocked(requireSession);
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

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("requireAmmoUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isDevAmmoAuthBypassEnabledMock.mockReturnValue(false);
    requireSessionMock.mockResolvedValue({
      session: {
        id: "session-1",
        userId: sessionUser.id,
        expiresAt: new Date(),
        token: "token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: sessionUser,
    });
  });

  it("requireSession を ammo-ledger 向けリダイレクトで呼ぶ", async () => {
    await requireAmmoUser();

    expect(requireSessionMock).toHaveBeenCalledWith({
      redirectTo: "/login?next=/lab/ammo-ledger",
    });
  });

  it("セッションのユーザーを返す", async () => {
    await expect(requireAmmoUser()).resolves.toEqual(sessionUser);
  });

  it("開発用バイパス有効時は指定ユーザーを返す", async () => {
    vi.stubEnv("AMMO_LEDGER_DEV_USER_EMAIL", sessionUser.email);
    isDevAmmoAuthBypassEnabledMock.mockReturnValue(true);
    resolveDevAmmoUserMock.mockResolvedValue(sessionUser);

    await expect(requireAmmoUser()).resolves.toEqual(sessionUser);
    expect(resolveDevAmmoUserMock).toHaveBeenCalledWith({
      email: sessionUser.email,
    });
    expect(requireSessionMock).not.toHaveBeenCalled();
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
  beforeEach(() => {
    vi.clearAllMocks();
    isDevAmmoAuthBypassEnabledMock.mockReturnValue(false);
    requireSessionMock.mockResolvedValue({
      session: {
        id: "session-1",
        userId: sessionUser.id,
        expiresAt: new Date(),
        token: "token",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      user: sessionUser,
    });
  });

  it("認証済みならユーザーを返す", async () => {
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  requireAmmoUser,
  resolveAmmoUserForMutation,
} from "@/features/ammo-ledger/auth/require-ammo-user";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { requireSession } from "@/features/auth/require-session/require-session";

vi.mock("@/features/auth/require-session/require-session", () => ({
  requireSession: vi.fn(),
}));

vi.mock(
  "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit",
  () => ({
    assertServerActionRateLimit: vi.fn(),
  }),
);

const requireSessionMock = vi.mocked(requireSession);
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

describe("requireAmmoUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

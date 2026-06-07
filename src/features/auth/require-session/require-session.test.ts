import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/get-session/get-session";
import { requireSession } from "@/features/auth/require-session/require-session";

vi.mock("@/features/auth/get-session/get-session", () => ({
  getSession: vi.fn(),
}));

const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const getSessionMock = vi.mocked(getSession);

const session = {
  session: {
    id: "session-1",
    userId: "user-1",
    expiresAt: new Date(),
    token: "token",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  user: {
    id: "user-1",
    name: "テストユーザー",
    email: "user@example.com",
    emailVerified: true,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
};

describe("requireSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("セッションがあれば返す", async () => {
    getSessionMock.mockResolvedValue(session);

    await expect(requireSession()).resolves.toEqual(session);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("セッションがなければログインへリダイレクトする", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(requireSession()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("redirectTo を指定できる", async () => {
    getSessionMock.mockResolvedValue(null);
    redirectMock.mockImplementation(() => {
      throw new Error("NEXT_REDIRECT");
    });

    await expect(requireSession({ redirectTo: "/login?next=/lab" })).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/lab");
  });
});

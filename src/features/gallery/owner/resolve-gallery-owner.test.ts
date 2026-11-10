import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "@/features/auth/get-session/get-session";
import { resolveGalleryOwner } from "@/features/gallery/owner/resolve-gallery-owner";

vi.mock("@/features/auth/get-session/get-session", () => ({
  getSession: vi.fn(),
}));

const getSessionMock = vi.mocked(getSession);

function sessionFor({ email }: { email: string }) {
  return {
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
      email,
      emailVerified: true,
      image: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  };
}

describe("resolveGalleryOwner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ログインしていなければ unauthenticated", async () => {
    vi.stubEnv("OWNER_EMAILS", "owner@example.com");
    getSessionMock.mockResolvedValue(null);

    await expect(resolveGalleryOwner()).resolves.toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });

  it("持ち主でなければ forbidden", async () => {
    vi.stubEnv("OWNER_EMAILS", "owner@example.com");
    getSessionMock.mockResolvedValue(sessionFor({ email: "visitor@example.com" }));

    await expect(resolveGalleryOwner()).resolves.toMatchObject({
      ok: false,
      code: "forbidden",
    });
  });

  it("OWNER_EMAILS が空なら、ログインしていても forbidden", async () => {
    vi.stubEnv("OWNER_EMAILS", "");
    getSessionMock.mockResolvedValue(sessionFor({ email: "owner@example.com" }));

    await expect(resolveGalleryOwner()).resolves.toMatchObject({
      ok: false,
      code: "forbidden",
    });
  });

  it("持ち主なら、メールの大文字小文字が違っても通す", async () => {
    vi.stubEnv("OWNER_EMAILS", "Owner@Example.com");
    getSessionMock.mockResolvedValue(sessionFor({ email: "OWNER@example.COM" }));

    await expect(resolveGalleryOwner()).resolves.toEqual({
      ok: true,
      user: { id: "user-1", email: "OWNER@example.COM" },
    });
  });
});

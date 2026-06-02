import { afterEach, describe, expect, it, vi } from "vitest";
import { getOwnerEmails, getTrustedOrigins, isSignUpAllowed } from "@/features/auth/auth-env";

describe("isSignUpAllowed", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未設定時は true", () => {
    expect(isSignUpAllowed()).toBe(true);
  });

  it.each(["false", "0"])("AUTH_ALLOW_SIGNUP=%s のとき false", (value) => {
    vi.stubEnv("AUTH_ALLOW_SIGNUP", value);
    expect(isSignUpAllowed()).toBe(false);
  });

  it.each(["true", "1"])("AUTH_ALLOW_SIGNUP=%s のとき true", (value) => {
    vi.stubEnv("AUTH_ALLOW_SIGNUP", value);
    expect(isSignUpAllowed()).toBe(true);
  });
});

describe("getOwnerEmails", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("空なら空配列", () => {
    expect(getOwnerEmails()).toEqual([]);
  });

  it("カンマ区切りを正規化する", () => {
    vi.stubEnv("OWNER_EMAILS", " Owner@Example.com , OTHER@test.com ");
    expect(getOwnerEmails()).toEqual(["owner@example.com", "other@test.com"]);
  });
});

describe("getTrustedOrigins", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("重複を除いてオリジンを返す", () => {
    vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    expect(getTrustedOrigins()).toEqual(["http://localhost:3000"]);
  });
});

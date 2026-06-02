import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authEmailCallbackPaths,
  isAuthEmailConfigured,
  isEmailVerificationRequired,
  shouldSendVerificationOnSignUp,
} from "@/features/auth/auth-email-env";
import { authSecretFixtures } from "@/features/auth/test-fixtures/auth-secret-fixtures";

describe("isEmailVerificationRequired", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未設定時は false", () => {
    expect(isEmailVerificationRequired()).toBe(false);
  });

  it("true のとき true", () => {
    vi.stubEnv("AUTH_REQUIRE_EMAIL_VERIFICATION", "true");
    expect(isEmailVerificationRequired()).toBe(true);
  });
});

describe("isAuthEmailConfigured", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("RESEND の両方がないと false", () => {
    expect(isAuthEmailConfigured()).toBe(false);
  });

  it("RESEND の両方があると true", () => {
    vi.stubEnv("RESEND_API_KEY", authSecretFixtures.resendApiKey);
    vi.stubEnv("RESEND_FROM_EMAIL", authSecretFixtures.resendFromEmail);
    expect(isAuthEmailConfigured()).toBe(true);
  });

  it("片方だけでは false", () => {
    vi.stubEnv("RESEND_API_KEY", authSecretFixtures.resendApiKey);
    expect(isAuthEmailConfigured()).toBe(false);
  });
});

describe("shouldSendVerificationOnSignUp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("Resend 設定時のみ true", () => {
    vi.stubEnv("RESEND_API_KEY", authSecretFixtures.resendApiKey);
    vi.stubEnv("RESEND_FROM_EMAIL", authSecretFixtures.resendFromEmail);
    expect(shouldSendVerificationOnSignUp()).toBe(true);
  });
});

describe("authEmailCallbackPaths", () => {
  it("確認フローのパスが固定", () => {
    expect(authEmailCallbackPaths.afterVerify).toBe("/lab/verify-email");
    expect(authEmailCallbackPaths.afterSignUp).toBe("/lab/verify-email?pending=1");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  listEnabledSocialProviderIds,
  listEnabledSocialProviderUi,
} from "@/features/auth/social-sign-in/social-provider-ui";
import { authSecretFixtures } from "@/features/auth/test-fixtures/auth-secret-fixtures";

describe("listEnabledSocialProviderIds", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("未設定時は空", () => {
    expect(listEnabledSocialProviderIds()).toEqual([]);
  });

  it("GitHub のみ", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", authSecretFixtures.githubClientId);
    vi.stubEnv("GITHUB_CLIENT_SECRET", authSecretFixtures.oauthClientSecret);
    expect(listEnabledSocialProviderIds()).toEqual(["github"]);
  });
});

describe("listEnabledSocialProviderUi", () => {
  it("有効 ID に対応する UI 定義だけ返す", () => {
    const items = listEnabledSocialProviderUi({ enabledIds: ["github", "unknown"] });
    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe("github");
    expect(items[0]?.iconSrc).toBe("/mark-github.svg");
  });
});

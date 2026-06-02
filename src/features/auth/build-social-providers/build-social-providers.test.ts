import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSocialProviders } from "@/features/auth/build-social-providers/build-social-providers";
import { authSecretFixtures } from "@/features/auth/test-fixtures/auth-secret-fixtures";

describe("buildSocialProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("資格情報が無いとき undefined", () => {
    expect(buildSocialProviders()).toBeUndefined();
  });

  it("揃ったプロバイダだけ含める", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", authSecretFixtures.githubClientId);
    vi.stubEnv("GITHUB_CLIENT_SECRET", authSecretFixtures.githubClientSecret);
    vi.stubEnv("GOOGLE_CLIENT_ID", authSecretFixtures.googleClientId);
    vi.stubEnv("GOOGLE_CLIENT_SECRET", authSecretFixtures.googleClientSecret);

    const providers = buildSocialProviders();
    expect(providers).toEqual({
      github: {
        clientId: authSecretFixtures.githubClientId,
        clientSecret: authSecretFixtures.githubClientSecret,
      },
      google: {
        clientId: authSecretFixtures.googleClientId,
        clientSecret: authSecretFixtures.googleClientSecret,
      },
    });
  });

  it("ID だけでは含めない", () => {
    vi.stubEnv("DISCORD_CLIENT_ID", authSecretFixtures.discordClientId);
    expect(buildSocialProviders()).toBeUndefined();
  });
});

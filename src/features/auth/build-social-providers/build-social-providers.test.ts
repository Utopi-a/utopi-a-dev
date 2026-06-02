import { afterEach, describe, expect, it, vi } from "vitest";
import { buildSocialProviders } from "@/features/auth/build-social-providers/build-social-providers";

describe("buildSocialProviders", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("資格情報が無いとき undefined", () => {
    expect(buildSocialProviders()).toBeUndefined();
  });

  it("揃ったプロバイダだけ含める", () => {
    vi.stubEnv("GITHUB_CLIENT_ID", "gh_id");
    vi.stubEnv("GITHUB_CLIENT_SECRET", "gh_secret");
    vi.stubEnv("GOOGLE_CLIENT_ID", "go_id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "go_secret");

    const providers = buildSocialProviders();
    expect(providers).toEqual({
      github: { clientId: "gh_id", clientSecret: "gh_secret" },
      google: { clientId: "go_id", clientSecret: "go_secret" },
    });
  });

  it("ID だけでは含めない", () => {
    vi.stubEnv("DISCORD_CLIENT_ID", "dc_id");
    expect(buildSocialProviders()).toBeUndefined();
  });
});

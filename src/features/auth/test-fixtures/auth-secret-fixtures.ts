/**
 * GitGuardian 等のシークレットスキャン用。
 * 本物の API キー形式（例: Resend の `re_` 接頭辞）を避けたテスト専用ダミー値。
 */
export const authSecretFixtures = {
  resendApiKey: "fixture-resend-api-key-not-real",
  resendFromEmail: "fixture <fixture@resend.dev>",
  githubClientId: "fixture-github-client-id",
  githubClientSecret: "fixture-github-client-secret",
  googleClientId: "fixture-google-client-id",
  googleClientSecret: "fixture-google-client-secret",
  discordClientId: "fixture-discord-client-id",
  oauthClientSecret: "fixture-oauth-client-secret",
} as const;

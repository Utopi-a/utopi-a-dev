function parseBoolean({
  value,
  defaultValue,
}: {
  value: string | undefined;
  defaultValue: boolean;
}) {
  if (value === undefined) {
    return defaultValue;
  }
  return value === "true" || value === "1";
}

export function isEmailVerificationRequired() {
  return parseBoolean({
    value: process.env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    defaultValue: false,
  });
}

export function isAuthEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

/** Resend があるときはサインアップ後に確認メールを送る（必須かどうかは別設定） */
export function shouldSendVerificationOnSignUp() {
  return isAuthEmailConfigured();
}

export const authEmailCallbackPaths = {
  afterVerify: "/lab/verify-email",
  afterSignUp: "/lab/verify-email?pending=1",
} as const;

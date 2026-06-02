const verifyEmailErrorMessages: Record<string, string> = {
  TOKEN_EXPIRED: "確認リンクの有効期限が切れています。確認メールを再送してください。",
  INVALID_TOKEN: "確認リンクが無効です。確認メールを再送してください。",
  USER_NOT_FOUND: "ユーザーが見つかりません。",
  EMAIL_ALREADY_VERIFIED: "すでにメール確認済みです。",
};

export function toVerifyEmailErrorMessage({ code }: { code: string | undefined }) {
  if (!code) {
    return null;
  }
  return verifyEmailErrorMessages[code] ?? "メール確認に失敗しました。もう一度お試しください。";
}

export function toAuthErrorMessage({ error }: { error: unknown }) {
  if (!error || typeof error !== "object") {
    return "認証に失敗しました。もう一度お試しください。";
  }

  const message =
    "message" in error && typeof error.message === "string" ? error.message : undefined;

  if (!message) {
    return "認証に失敗しました。もう一度お試しください。";
  }

  const normalized = message.toLowerCase();

  if (normalized.includes("invalid email or password")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (normalized.includes("user already exists")) {
    return "このメールアドレスはすでに登録されています。";
  }

  if (normalized.includes("sign up is not enabled")) {
    return "新規登録は現在受け付けていません。";
  }

  if (normalized.includes("password") && normalized.includes("short")) {
    return "パスワードは12文字以上にしてください。";
  }

  return message;
}

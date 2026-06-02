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
    return "パスワードは8文字以上にしてください。";
  }

  if (normalized.includes("password") && normalized.includes("too long")) {
    return "パスワードは128文字以内にしてください。";
  }

  if (normalized.includes("email not verified") || normalized.includes("email_not_verified")) {
    return "メールアドレスが未確認です。受信トレイの確認メールを開くか、再送してください。";
  }

  if (normalized.includes("email already verified")) {
    return "メールアドレスはすでに確認済みです。";
  }

  return message;
}

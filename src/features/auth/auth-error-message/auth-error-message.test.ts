import { describe, expect, it } from "vitest";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

describe("toAuthErrorMessage", () => {
  it("不明な error は汎用メッセージ", () => {
    expect(toAuthErrorMessage({ error: null })).toBe(
      "認証に失敗しました。もう一度お試しください。",
    );
  });

  it.each([
    {
      input: { message: "Invalid email or password" },
      expected: "メールアドレスまたはパスワードが正しくありません。",
    },
    {
      input: { message: "User already exists" },
      expected: "このメールアドレスはすでに登録されています。",
    },
    {
      input: { message: "Sign up is not enabled" },
      expected: "新規登録は現在受け付けていません。",
    },
    {
      input: { message: "Password is too short" },
      expected: "パスワードは8文字以上にしてください。",
    },
    {
      input: { message: "Password is too long" },
      expected: "パスワードは128文字以内にしてください。",
    },
    {
      input: { message: "Email not verified" },
      expected: "メールアドレスが未確認です。受信トレイの確認メールを開くか、再送してください。",
    },
  ])("$expected", ({ input, expected }) => {
    expect(toAuthErrorMessage({ error: input })).toBe(expected);
  });

  it("未知のメッセージはそのまま返す", () => {
    expect(toAuthErrorMessage({ error: { message: "Custom API error" } })).toBe("Custom API error");
  });
});

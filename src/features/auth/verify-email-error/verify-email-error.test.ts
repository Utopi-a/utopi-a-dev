import { describe, expect, it } from "vitest";
import { toVerifyEmailErrorMessage } from "@/features/auth/verify-email-error/verify-email-error";

describe("toVerifyEmailErrorMessage", () => {
  it("code が無いとき null", () => {
    expect(toVerifyEmailErrorMessage({ code: undefined })).toBeNull();
  });

  it.each([
    { code: "TOKEN_EXPIRED", expected: /有効期限/ },
    { code: "INVALID_TOKEN", expected: /無効/ },
    { code: "EMAIL_ALREADY_VERIFIED", expected: /確認済み/ },
  ])("$code", ({ code, expected }) => {
    expect(toVerifyEmailErrorMessage({ code })).toMatch(expected);
  });

  it("未知の code は汎用メッセージ", () => {
    expect(toVerifyEmailErrorMessage({ code: "UNKNOWN" })).toMatch(/メール確認に失敗/);
  });
});

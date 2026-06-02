import { describe, expect, it } from "vitest";
import {
  evaluatePassword,
  getPasswordPolicyError,
} from "@/features/auth/password-policy/evaluate-password";
import { passwordPolicyLimits } from "@/features/auth/password-policy/password-policy";

describe("evaluatePassword", () => {
  it("空文字は未入力扱い", () => {
    const result = evaluatePassword({ password: "" });
    expect(result.strength).toBe(0);
    expect(result.strengthLabel).toBe("未入力");
    expect(result.meetsRequiredPolicy).toBe(false);
    expect(result.meetsRecommendedPolicy).toBe(false);
  });

  it("必須4種を満たすパスワードは登録可能", () => {
    const result = evaluatePassword({ password: "Abcd1234" });
    expect(result.meetsRequiredPolicy).toBe(true);
    expect(result.strength).toBeGreaterThanOrEqual(3);
  });

  it("記号と12文字以上で推奨要件も満たし最高評価", () => {
    const result = evaluatePassword({ password: "Abcd1234!xyz" });
    expect(result.meetsRequiredPolicy).toBe(true);
    expect(result.meetsRecommendedPolicy).toBe(true);
    expect(result.strength).toBe(4);
    expect(result.strengthLabel).toBe("とても強い");
  });

  it.each([
    { password: "abcdefgh", missing: ["uppercase", "digit"] },
    { password: "ABCDEFGH", missing: ["lowercase", "digit"] },
    { password: "12345678", missing: ["lowercase", "uppercase"] },
    { password: "Abc123", missing: ["minLength"] },
  ])("不足: $password", ({ password, missing }) => {
    const result = evaluatePassword({ password });
    expect(result.meetsRequiredPolicy).toBe(false);
    for (const ruleId of missing) {
      const rule = result.rules.find((item) => item.id === ruleId);
      expect(rule?.passed).toBe(false);
    }
  });

  it("最大長を超えると必須を満たさない", () => {
    const password = `Aa1!${"x".repeat(passwordPolicyLimits.maxLength)}`;
    const result = evaluatePassword({ password });
    expect(result.strengthLabel).toBe("長すぎます");
    expect(result.meetsRequiredPolicy).toBe(false);
  });

  it("境界値: ちょうど8文字で minLength を満たす", () => {
    const result = evaluatePassword({ password: "Abcd1234" });
    const minRule = result.rules.find((rule) => rule.id === "minLength");
    expect(minRule?.passed).toBe(true);
  });

  it("6つのルールすべてを返す", () => {
    const result = evaluatePassword({ password: "x" });
    expect(result.rules).toHaveLength(6);
    expect(result.rules.filter((rule) => rule.required)).toHaveLength(4);
  });
});

describe("getPasswordPolicyError", () => {
  it("要件を満たすと null", () => {
    expect(getPasswordPolicyError({ password: "Abcd1234" })).toBeNull();
  });

  it("要件を満たさないと失敗した必須ラベルを列挙する", () => {
    const message = getPasswordPolicyError({ password: "short" });
    expect(message).toMatch(/要件/);
    expect(message).toMatch(/8文字以上/);
  });

  it("長すぎるパスワードは専用メッセージ", () => {
    const password = `Aa1!${"a".repeat(passwordPolicyLimits.maxLength)}`;
    expect(getPasswordPolicyError({ password })).toBe(
      `パスワードは${passwordPolicyLimits.maxLength}文字以内にしてください。`,
    );
  });
});

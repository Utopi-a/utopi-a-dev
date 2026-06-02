import {
  type PasswordRuleDefinition,
  type PasswordRuleId,
  passwordPolicyLimits,
  passwordRules,
} from "@/features/auth/password-policy/password-policy";

export type PasswordStrengthLevel = 0 | 1 | 2 | 3 | 4;

export type PasswordRuleResult = {
  id: PasswordRuleId;
  label: string;
  required: boolean;
  passed: boolean;
};

export type PasswordEvaluation = {
  rules: PasswordRuleResult[];
  strength: PasswordStrengthLevel;
  strengthLabel: string;
  meetsRequiredPolicy: boolean;
  meetsRecommendedPolicy: boolean;
};

const strengthLabels: Record<PasswordStrengthLevel, string> = {
  0: "未入力",
  1: "弱い",
  2: "ふつう",
  3: "強い",
  4: "とても強い",
};

function evaluateRules({ password }: { password: string }): PasswordRuleResult[] {
  return passwordRules.map((rule: PasswordRuleDefinition) => ({
    id: rule.id,
    label: rule.label,
    required: rule.required,
    passed: rule.test(password),
  }));
}

function calculateStrength({
  password,
  rules,
}: {
  password: string;
  rules: PasswordRuleResult[];
}): PasswordStrengthLevel {
  if (password.length === 0) {
    return 0;
  }

  const requiredPassed = rules.filter((rule) => rule.required).every((rule) => rule.passed);
  const optionalPassed = rules.filter((rule) => !rule.required).every((rule) => rule.passed);

  if (!rules.find((rule) => rule.id === "minLength")?.passed) {
    return 1;
  }

  const typeRules = rules.filter((rule) => ["lowercase", "uppercase", "digit"].includes(rule.id));
  const typePassedCount = typeRules.filter((rule) => rule.passed).length;

  if (!requiredPassed) {
    return typePassedCount >= 2 ? 2 : 1;
  }

  if (optionalPassed) {
    return 4;
  }

  return 3;
}

export function evaluatePassword({ password }: { password: string }): PasswordEvaluation {
  const rules = evaluateRules({ password });
  const requiredRules = rules.filter((rule) => rule.required);
  const meetsRequiredPolicy = requiredRules.every((rule) => rule.passed);
  const meetsRecommendedPolicy = rules.every((rule) => rule.passed);
  const strength = calculateStrength({ password, rules });

  if (password.length > passwordPolicyLimits.maxLength) {
    return {
      rules,
      strength: 1,
      strengthLabel: "長すぎます",
      meetsRequiredPolicy: false,
      meetsRecommendedPolicy: false,
    };
  }

  return {
    rules,
    strength,
    strengthLabel: strengthLabels[strength],
    meetsRequiredPolicy,
    meetsRecommendedPolicy,
  };
}

export function getPasswordPolicyError({ password }: { password: string }): string | null {
  const evaluation = evaluatePassword({ password });

  if (password.length > passwordPolicyLimits.maxLength) {
    return `パスワードは${passwordPolicyLimits.maxLength}文字以内にしてください。`;
  }

  if (evaluation.meetsRequiredPolicy) {
    return null;
  }

  const failedRequired = evaluation.rules
    .filter((rule) => rule.required && !rule.passed)
    .map((rule) => rule.label);

  return `パスワードの要件を満たしていません: ${failedRequired.join("、")}`;
}

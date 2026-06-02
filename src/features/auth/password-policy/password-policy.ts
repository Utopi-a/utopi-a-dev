export const passwordPolicyLimits = {
  minLength: 8,
  maxLength: 128,
  recommendedLength: 12,
} as const;

export type PasswordRuleId =
  | "minLength"
  | "lowercase"
  | "uppercase"
  | "digit"
  | "special"
  | "recommendedLength";

export type PasswordRuleDefinition = {
  id: PasswordRuleId;
  label: string;
  required: boolean;
  test: (password: string) => boolean;
};

export const passwordRules: PasswordRuleDefinition[] = [
  {
    id: "minLength",
    label: `${passwordPolicyLimits.minLength}文字以上`,
    required: true,
    test: (password) => password.length >= passwordPolicyLimits.minLength,
  },
  {
    id: "lowercase",
    label: "英小文字（a–z）を含む",
    required: true,
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "uppercase",
    label: "英大文字（A–Z）を含む",
    required: true,
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "digit",
    label: "数字を含む",
    required: true,
    test: (password) => /\d/.test(password),
  },
  {
    id: "special",
    label: "記号を含む（!@#$ など）",
    required: false,
    test: (password) => /[^A-Za-z0-9]/.test(password),
  },
  {
    id: "recommendedLength",
    label: `${passwordPolicyLimits.recommendedLength}文字以上（推奨）`,
    required: false,
    test: (password) => password.length >= passwordPolicyLimits.recommendedLength,
  },
];

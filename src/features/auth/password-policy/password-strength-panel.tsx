"use client";

import { CheckIcon, XIcon } from "lucide-react";
import { evaluatePassword } from "@/features/auth/password-policy/evaluate-password";
import { cn } from "@/lib/cn";

type PasswordStrengthPanelProps = {
  password: string;
  idPrefix: string;
};

const strengthBarClass: Record<number, string> = {
  0: "bg-muted",
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-primary",
  4: "bg-emerald-500",
};

export function PasswordStrengthPanel({ password, idPrefix }: PasswordStrengthPanelProps) {
  const evaluation = evaluatePassword({ password });
  const showDetails = password.length > 0;

  if (!showDetails) {
    return (
      <p className="text-xs text-muted-foreground">
        8文字以上で、英大文字・英小文字・数字を含めてください。
      </p>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-3">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="font-medium text-foreground">堅牢度</span>
          <span className="text-muted-foreground">{evaluation.strengthLabel}</span>
        </div>
        <div className="flex gap-1" aria-hidden>
          {[1, 2, 3, 4].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                evaluation.strength >= segment ? strengthBarClass[evaluation.strength] : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      <ul className="space-y-1.5" aria-label="パスワード要件">
        {evaluation.rules.map((rule) => {
          const itemId = `${idPrefix}-rule-${rule.id}`;
          return (
            <li key={rule.id} className="flex items-start gap-2 text-xs">
              {rule.passed ? (
                <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-emerald-600" aria-hidden />
              ) : (
                <XIcon
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    rule.required ? "text-destructive" : "text-muted-foreground",
                  )}
                  aria-hidden
                />
              )}
              <span
                id={itemId}
                className={cn(
                  rule.passed ? "text-muted-foreground" : "text-foreground",
                  !rule.required && !rule.passed ? "text-muted-foreground" : null,
                )}
              >
                {rule.label}
                {!rule.required ? "（任意）" : null}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {evaluation.meetsRequiredPolicy
          ? evaluation.meetsRecommendedPolicy
            ? "推奨要件も満たしています。"
            : "登録に必要な要件は満たしています。"
          : "必須の要件をすべて満たすと登録できます。"}
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/auth-client";
import { authEmailCallbackPaths } from "@/features/auth/auth-email-env";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

const pendingEmailStorageKey = "auth.pendingVerificationEmail";

type ResendVerificationFormProps = {
  /** ログイン済みなら渡す。未ログイン（確認必須の新規登録直後など）は未指定で入力欄を表示 */
  email?: string;
};

export function ResendVerificationForm({ email: emailFromSession }: ResendVerificationFormProps) {
  const [email, setEmail] = useState(emailFromSession ?? "");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);
  const needsEmailInput = !emailFromSession;

  useEffect(() => {
    if (emailFromSession) {
      return;
    }
    const stored = sessionStorage.getItem(pendingEmailStorageKey);
    if (stored) {
      setEmail(stored);
    }
  }, [emailFromSession]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.sendVerificationEmail({
      email,
      callbackURL: authEmailCallbackPaths.afterVerify,
    });

    if (result.error) {
      setErrorMessage(toAuthErrorMessage({ error: result.error }));
      setIsPending(false);
      return;
    }

    setIsSent(true);
    setIsPending(false);
  }

  if (isSent) {
    return (
      <p className="text-sm text-muted-foreground">
        確認メールを送信しました。受信トレイを確認してください。
      </p>
    );
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      {needsEmailInput ? (
        <div className="space-y-2">
          <Label htmlFor="resend-verification-email">メールアドレス</Label>
          <Input
            id="resend-verification-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={isPending || !email}>
        {isPending ? "送信中…" : "確認メールを再送"}
      </Button>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </form>
  );
}

export function storePendingVerificationEmail({ email }: { email: string }) {
  sessionStorage.setItem(pendingEmailStorageKey, email);
}

export function clearPendingVerificationEmail() {
  sessionStorage.removeItem(pendingEmailStorageKey);
}

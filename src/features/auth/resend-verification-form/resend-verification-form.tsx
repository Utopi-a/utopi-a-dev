"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { authEmailCallbackPaths } from "@/features/auth/auth-email-env";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

type ResendVerificationFormProps = {
  email: string;
};

export function ResendVerificationForm({ email }: ResendVerificationFormProps) {
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  async function handleClick() {
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
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
        {isPending ? "送信中…" : "確認メールを再送"}
      </Button>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

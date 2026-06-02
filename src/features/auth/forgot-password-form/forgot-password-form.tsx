"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/auth-client";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
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
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          リセット手順を送信しました（登録済みのメールの場合）。開発環境ではサーバーログにリンクが出ます。
        </p>
        <Link href="/login" className="font-medium text-primary hover:underline">
          ログインに戻る
        </Link>
      </div>
    );
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="forgot-email">メールアドレス</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "送信中…" : "リセットリンクを送信"}
      </Button>
    </form>
  );
}

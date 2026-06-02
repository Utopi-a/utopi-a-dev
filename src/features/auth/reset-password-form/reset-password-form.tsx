"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/auth-client";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

type ResetPasswordFormProps = {
  token: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });

    if (result.error) {
      setErrorMessage(toAuthErrorMessage({ error: result.error }));
      setIsPending(false);
      return;
    }

    router.push("/login");
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="reset-password">新しいパスワード（12文字以上）</Label>
        <Input
          id="reset-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "更新中…" : "パスワードを更新"}
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-primary"
      >
        ログインに戻る
      </Link>
    </form>
  );
}

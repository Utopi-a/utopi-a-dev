"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/auth-client";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";
import {
  clearSavedSignInEmail,
  readSavedSignInEmail,
  writeSavedSignInEmail,
} from "@/features/auth/sign-in-form/saved-sign-in-email";

type SignInFormProps = {
  callbackURL: string;
};

export function SignInForm({ callbackURL }: SignInFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberEmail, setRememberEmail] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const savedEmail = readSavedSignInEmail();
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.signIn.email({
      email,
      password,
      callbackURL,
    });

    if (result.error) {
      setErrorMessage(toAuthErrorMessage({ error: result.error }));
      setIsPending(false);
      return;
    }

    if (rememberEmail) {
      writeSavedSignInEmail({ email });
    } else {
      clearSavedSignInEmail();
    }

    router.push(callbackURL);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} autoComplete="on">
      <div className="space-y-2">
        <Label htmlFor="sign-in-email">メールアドレス</Label>
        <Input
          id="sign-in-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor="sign-in-password">パスワード</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-muted-foreground hover:text-primary"
          >
            パスワードを忘れた
          </Link>
        </div>
        <Input
          id="sign-in-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="remember-email"
          checked={rememberEmail}
          onChange={(event) => setRememberEmail(event.target.checked)}
          className="size-4 rounded border border-input accent-primary"
        />
        メールアドレスを保存
      </label>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "ログイン中…" : "ログイン"}
      </Button>
    </form>
  );
}

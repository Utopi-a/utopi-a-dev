"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/features/auth/auth-client";
import { authEmailCallbackPaths } from "@/features/auth/auth-email-env";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";

type SignUpFormProps = {
  callbackURL: string;
  sendsVerificationEmail: boolean;
  requiresEmailVerification: boolean;
};

export function SignUpForm({
  callbackURL,
  sendsVerificationEmail,
  requiresEmailVerification,
}: SignUpFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPending(true);
    setErrorMessage(null);

    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: sendsVerificationEmail ? authEmailCallbackPaths.afterVerify : callbackURL,
    });

    if (result.error) {
      setErrorMessage(toAuthErrorMessage({ error: result.error }));
      setIsPending(false);
      return;
    }

    if (requiresEmailVerification || sendsVerificationEmail) {
      router.push(authEmailCallbackPaths.afterSignUp);
      router.refresh();
      return;
    }

    router.push(callbackURL);
    router.refresh();
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="sign-up-name">表示名</Label>
        <Input
          id="sign-up-name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-up-email">メールアドレス</Label>
        <Input
          id="sign-up-email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="sign-up-password">パスワード（12文字以上）</Label>
        <Input
          id="sign-up-password"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      {sendsVerificationEmail ? (
        <p className="text-xs text-muted-foreground">
          登録後に確認メールを送信します。
          {requiresEmailVerification ? "確認が完了するまでログインできません。" : null}
        </p>
      ) : null}
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "登録中…" : "アカウントを作成"}
      </Button>
    </form>
  );
}

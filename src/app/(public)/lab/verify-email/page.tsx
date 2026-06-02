import Link from "next/link";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthEmailConfigured } from "@/features/auth/auth-email-env";
import { getSession } from "@/features/auth/get-session/get-session";
import { ResendVerificationForm } from "@/features/auth/resend-verification-form/resend-verification-form";
import { toVerifyEmailErrorMessage } from "@/features/auth/verify-email-error/verify-email-error";
import { VerifyEmailStatus } from "@/features/auth/verify-email-status/verify-email-status";
import { cn } from "@/lib/cn";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    error?: string;
    pending?: string;
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const session = await getSession();
  const { error, pending } = await searchParams;
  const errorMessage = toVerifyEmailErrorMessage({ code: error });
  const isPendingSignup = pending === "1";
  const isVerified = session?.user.emailVerified ?? false;
  const emailConfigured = isAuthEmailConfigured();
  const hasError = Boolean(error);

  return (
    <PublicPageShell width="content">
      <VerifyEmailStatus isVerified={isVerified} hasError={hasError} />
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">メール確認</CardTitle>
            <CardDescription>
              {errorMessage
                ? errorMessage
                : isVerified
                  ? "メールアドレスの確認が完了しました。Lab の Studio を利用できます。"
                  : isPendingSignup
                    ? "確認メールを送信しました。メール内のリンクを開いてください。届かない場合は再送できます。"
                    : "メール内のリンクを開くと確認が完了します。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isVerified && emailConfigured ? (
              <ResendVerificationForm email={session?.user.email} />
            ) : null}
            {!isVerified && !emailConfigured ? (
              <p className="text-sm text-muted-foreground">
                Resend 未設定のため、開発時はサーバーログの確認リンクを使ってください。
              </p>
            ) : null}
            <Link href="/lab" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Lab に戻る
            </Link>
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}

import Link from "next/link";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/features/auth/get-session/get-session";
import { ResendVerificationForm } from "@/features/auth/resend-verification-form/resend-verification-form";
import { toVerifyEmailErrorMessage } from "@/features/auth/verify-email-error/verify-email-error";
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

  return (
    <PublicPageShell width="content">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">メール確認</CardTitle>
            <CardDescription>
              {errorMessage
                ? errorMessage
                : isVerified
                  ? "メールアドレスの確認が完了しています。"
                  : isPendingSignup
                    ? "確認メールを送信しました。メール内のリンクを開いてください。"
                    : "メール内のリンクからこのページに戻ると、確認状態が更新されます。"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {session && !session.user.emailVerified ? (
              <ResendVerificationForm email={session.user.email} />
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

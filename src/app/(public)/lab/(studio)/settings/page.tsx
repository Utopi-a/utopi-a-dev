import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthEmailConfigured, isEmailVerificationRequired } from "@/features/auth/auth-email-env";
import { requireSession } from "@/features/auth/require-session/require-session";
import { ResendVerificationForm } from "@/features/auth/resend-verification-form/resend-verification-form";
import { cn } from "@/lib/cn";

export default async function LabSettingsPage() {
  const session = await requireSession();
  const emailConfigured = isAuthEmailConfigured();
  const verificationRequired = isEmailVerificationRequired();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">アカウント</h1>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>メール: {session.user.email}</p>
          <p>名前: {session.user.name}</p>
          <p>メール確認: {session.user.emailVerified ? "済" : "未確認"}</p>
          {!session.user.emailVerified && emailConfigured ? (
            <div className="space-y-2 pt-1">
              <ResendVerificationForm email={session.user.email} />
              <Link
                href="/lab/verify-email"
                className={cn(buttonVariants({ variant: "link", size: "sm" }), "h-auto px-0")}
              >
                メール確認の説明
              </Link>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">メール（Resend）</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            {emailConfigured
              ? "Resend 設定済み。パスワードリセットとメール確認を送信します。"
              : "Resend 未設定。開発時はサーバーログにリンクが出力されます。"}
          </p>
          <p>
            メール確認の必須化:{" "}
            {verificationRequired ? "有効（AUTH_REQUIRE_EMAIL_VERIFICATION）" : "無効"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

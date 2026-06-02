import { PublicPageShell } from "@/components/layout/public-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthEmailConfigured } from "@/features/auth/auth-email-env";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form/forgot-password-form";

export default function ForgotPasswordPage() {
  const usesResend = isAuthEmailConfigured();

  return (
    <PublicPageShell width="content">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">パスワード再設定</CardTitle>
            <CardDescription>
              {usesResend
                ? "登録メールに Resend 経由でリセット用リンクを送ります。"
                : "登録メールにリセット用リンクを送ります（未設定時は開発ログに出力）。"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm usesResend={usesResend} />
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}

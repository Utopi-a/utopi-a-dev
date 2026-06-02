import { PublicPageShell } from "@/components/layout/public-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/forgot-password-form/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <PublicPageShell width="content">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">パスワード再設定</CardTitle>
            <CardDescription>
              登録メールにリセット用リンクを送ります。本番ではメール送信の設定が必要です。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}

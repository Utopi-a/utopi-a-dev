import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthEmailConfigured } from "@/features/auth/auth-email-env";
import { requireSession } from "@/features/auth/require-session/require-session";

export default async function LabSettingsPage() {
  const session = await requireSession();
  const emailConfigured = isAuthEmailConfigured();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">アカウント</h1>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">プロフィール</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>メール: {session.user.email}</p>
          <p>名前: {session.user.name}</p>
          <p>メール確認: {session.user.emailVerified ? "済" : "未確認"}</p>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">メール送信</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {emailConfigured
            ? "Resend が設定済みです。パスワードリセット・メール確認を送信できます。"
            : "Resend 未設定のため、開発時はターミナルにリンクが出力されます。"}
        </CardContent>
      </Card>
    </div>
  );
}

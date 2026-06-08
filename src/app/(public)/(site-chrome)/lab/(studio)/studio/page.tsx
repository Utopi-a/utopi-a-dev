import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/features/auth/require-session/require-session";

export default async function LabStudioPage() {
  const session = await requireSession();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">セッション</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>メール: {session.user.email}</p>
          <p>名前: {session.user.name}</p>
          <p>メール確認: {session.user.emailVerified ? "済" : "未確認"}</p>
        </CardContent>
      </Card>
    </div>
  );
}

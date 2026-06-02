import Link from "next/link";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/reset-password-form/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <PublicPageShell width="content">
      <div className="mx-auto w-full max-w-md">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">新しいパスワード</CardTitle>
            <CardDescription>リセット用リンクから開いたページです。</CardDescription>
          </CardHeader>
          <CardContent>
            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="text-sm text-muted-foreground">
                トークンが無効です。
                <Link href="/forgot-password" className="ml-1 text-primary hover:underline">
                  もう一度リクエスト
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PublicPageShell>
  );
}

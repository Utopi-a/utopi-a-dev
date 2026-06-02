import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/features/auth/get-session/get-session";
import { SignOutButton } from "@/features/auth/sign-out-button/sign-out-button";
import { cn } from "@/lib/cn";

const studioLinks = [
  { href: "/lab/studio", label: "ダッシュボード" },
  { href: "/lab/blog/manage", label: "ブログ管理" },
  { href: "/lab/settings", label: "アカウント" },
] as const;

export async function LabStudioPanel() {
  const session = await getSession();

  if (!session) {
    return (
      <Card className="border-border/70 bg-card/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">ログインエリア</CardTitle>
          <CardDescription>
            認証・ブログ管理・課金まわりの試作は Lab 内から利用します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login?next=/lab" className={cn(buttonVariants({ variant: "default" }))}>
            ログイン
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20 bg-card/80 shadow-sm">
      <CardHeader className="gap-2">
        <CardTitle className="text-base">Studio</CardTitle>
        <CardDescription>
          ログイン中: {session.user.email}
          {session.user.emailVerified ? "" : "（メール未確認）"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <nav className="flex flex-wrap gap-2">
          {studioLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <SignOutButton variant="ghost" className="w-fit px-2" />
      </CardContent>
    </Card>
  );
}

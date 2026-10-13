import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { isAuthEmailConfigured } from "@/features/auth/auth-email-env";
import { getSession } from "@/features/auth/get-session/get-session";
import { ResendVerificationForm } from "@/features/auth/resend-verification-form/resend-verification-form";
import { SignOutButton } from "@/features/auth/sign-out-button/sign-out-button";
import { cn } from "@/lib/cn";

const studioLinks = [
  { href: "/lab/studio", label: "ダッシュボード" },
  { href: "/lab/ammo-ledger", label: "実包管理帳簿" },
  { href: "/lab/blog/manage", label: "ブログ管理" },
  { href: "/lab/settings", label: "アカウント" },
] as const;

export async function LabStudioPanel() {
  const session = await getSession();
  const emailConfigured = isAuthEmailConfigured();

  if (!session) {
    return (
      <section className="flex flex-col items-start gap-4">
        <div className="space-y-1">
          <h2 className="font-bold">ログインエリア</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            認証・ブログ管理・課金まわりの試作は Lab 内から利用します。
          </p>
        </div>
        <Link
          href="/login?next=/lab"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ログイン
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col items-start gap-4">
      <div className="space-y-1">
        <h2 className="font-bold">Studio</h2>
        <p className="text-sm text-muted-foreground">
          ログイン中: {session.user.email}
          {session.user.emailVerified ? "（確認済み）" : "（メール未確認）"}
        </p>
      </div>
      {!session.user.emailVerified && emailConfigured ? (
        <div className="w-full rounded-lg bg-muted px-4 py-3">
          <p className="mb-2 text-sm text-muted-foreground">
            確認メールのリンクを開くと Studio をフルに使えます。
          </p>
          <ResendVerificationForm email={session.user.email} />
        </div>
      ) : null}
      <nav className="flex flex-wrap gap-2" aria-label="Studio">
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
      <SignOutButton variant="ghost" className="-ml-2.5 w-fit text-muted-foreground" />
    </section>
  );
}

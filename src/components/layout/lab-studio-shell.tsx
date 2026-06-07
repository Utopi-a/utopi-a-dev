import Link from "next/link";
import { getSession } from "@/features/auth/get-session/get-session";
import { SignOutButton } from "@/features/auth/sign-out-button/sign-out-button";
import { ThemeToggle } from "@/lib/theme/theme-toggle";

export async function LabStudioShell({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <Link href="/lab" className="text-sm text-muted-foreground hover:text-foreground">
          ← Lab に戻る
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <span className="max-w-[14rem] truncate text-sm text-muted-foreground">
              {session.user.email}
            </span>
          ) : null}
          <ThemeToggle />
          <SignOutButton variant="outline" className="h-8" />
        </div>
      </div>
      {children}
    </div>
  );
}

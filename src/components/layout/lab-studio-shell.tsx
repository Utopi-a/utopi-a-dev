import Link from "next/link";
import { getSession } from "@/features/auth/get-session/get-session";
import { SignOutButton } from "@/features/auth/sign-out-button/sign-out-button";
import { cn } from "@/lib/cn";

export async function LabStudioShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const session = await getSession();

  return (
    <div className={cn("mx-auto flex w-full max-w-3xl flex-col gap-4", className)}>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
        <Link href="/lab" className="text-sm text-muted-foreground hover:text-foreground">
          ← Lab に戻る
        </Link>
        <div className="flex items-center gap-3">
          {session ? (
            <span className="max-w-[14rem] truncate text-sm text-muted-foreground">
              {session.user.email}
            </span>
          ) : null}
          <SignOutButton variant="outline" className="h-8" />
        </div>
      </div>
      {children}
    </div>
  );
}

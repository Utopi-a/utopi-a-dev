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
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-6 sm:px-6 sm:pb-8",
        className,
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/lab" className="w-fit text-sm text-muted-foreground hover:text-foreground">
          ← Lab に戻る
        </Link>
        {session ? (
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:max-w-[14rem] sm:flex-none">
              {session.user.email}
            </span>
            <SignOutButton
              variant="outline"
              className="h-8 shrink-0 px-2.5 text-xs sm:px-3 sm:text-sm"
            />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

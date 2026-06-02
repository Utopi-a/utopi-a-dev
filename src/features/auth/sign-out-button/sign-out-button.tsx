"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";

type SignOutButtonProps = {
  variant?: "default" | "outline" | "ghost";
  className?: string;
};

export function SignOutButton({ variant = "outline", className }: SignOutButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleSignOut() {
    setIsPending(true);
    await authClient.signOut();
    router.push("/lab");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      disabled={isPending}
      onClick={handleSignOut}
    >
      {isPending ? "ログアウト中…" : "ログアウト"}
    </Button>
  );
}

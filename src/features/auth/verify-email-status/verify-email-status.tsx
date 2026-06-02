"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { clearPendingVerificationEmail } from "@/features/auth/resend-verification-form/resend-verification-form";

type VerifyEmailStatusProps = {
  isVerified: boolean;
  hasError: boolean;
};

/** 確認成功後に sessionStorage を消し、セッション cookie を反映する */
export function VerifyEmailStatus({ isVerified, hasError }: VerifyEmailStatusProps) {
  const router = useRouter();

  useEffect(() => {
    if (isVerified) {
      clearPendingVerificationEmail();
      router.refresh();
    }
  }, [isVerified, router]);

  if (hasError || !isVerified) {
    return null;
  }

  return null;
}

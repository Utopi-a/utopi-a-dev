"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/auth-client";
import { toAuthErrorMessage } from "@/features/auth/auth-error-message/auth-error-message";
import type { SocialProviderId } from "@/features/auth/social-sign-in/social-provider-ui";

type SocialProviderButtonConfig = {
  id: SocialProviderId;
  label: string;
  iconSrc?: string;
};

type SocialSignInButtonsProps = {
  callbackURL: string;
  providers: SocialProviderButtonConfig[];
};

export function SocialSignInButtons({ callbackURL, providers }: SocialSignInButtonsProps) {
  const [pendingId, setPendingId] = useState<SocialProviderId | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (providers.length === 0) {
    return null;
  }

  async function handleClick({ providerId }: { providerId: SocialProviderId }) {
    setPendingId(providerId);
    setErrorMessage(null);

    const result = await authClient.signIn.social({
      provider: providerId,
      callbackURL,
    });

    if (result.error) {
      setErrorMessage(toAuthErrorMessage({ error: result.error }));
      setPendingId(null);
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-2">
        {providers.map((provider) => (
          <Button
            key={provider.id}
            type="button"
            variant="outline"
            className="w-full"
            disabled={pendingId !== null}
            onClick={() => handleClick({ providerId: provider.id })}
          >
            {provider.iconSrc ? (
              <Image src={provider.iconSrc} alt="" width={18} height={18} className="size-4" />
            ) : null}
            {pendingId === provider.id
              ? `${provider.label} に接続中…`
              : `${provider.label} で続ける`}
          </Button>
        ))}
      </div>
      {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
    </div>
  );
}

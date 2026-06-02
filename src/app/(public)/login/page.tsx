import { redirect } from "next/navigation";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import {
  isEmailVerificationRequired,
  shouldSendVerificationOnSignUp,
} from "@/features/auth/auth-email-env";
import { isSignUpAllowed } from "@/features/auth/auth-env";
import { getSession } from "@/features/auth/get-session/get-session";
import { LoginView } from "@/features/auth/login-view/login-view";
import {
  listEnabledSocialProviderIds,
  listEnabledSocialProviderUi,
} from "@/features/auth/social-sign-in/social-provider-ui";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

function resolveCallbackURL({ next }: { next?: string }) {
  if (next?.startsWith("/") && !next.startsWith("//")) {
    return next;
  }
  return "/lab";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { next } = await searchParams;
  const callbackURL = resolveCallbackURL({ next });
  const enabledIds = listEnabledSocialProviderIds();
  const socialProviders = listEnabledSocialProviderUi({ enabledIds });

  if (session) {
    redirect(callbackURL);
  }

  return (
    <PublicPageShell width="content">
      <LoginView
        callbackURL={callbackURL}
        signUpAllowed={isSignUpAllowed()}
        sendsVerificationEmail={shouldSendVerificationOnSignUp()}
        requiresEmailVerification={isEmailVerificationRequired()}
        socialProviders={socialProviders}
      />
    </PublicPageShell>
  );
}

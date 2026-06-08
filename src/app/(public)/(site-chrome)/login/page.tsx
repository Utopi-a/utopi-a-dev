import { redirect } from "next/navigation";
import { PublicPageShell } from "@/components/layout/public-page-shell";
import {
  isEmailVerificationRequired,
  shouldSendVerificationOnSignUp,
} from "@/features/auth/auth-email-env";
import { isSignUpAllowed } from "@/features/auth/auth-env";
import { getSession } from "@/features/auth/get-session/get-session";
import { LoginView } from "@/features/auth/login-view/login-view";
import { resolveAuthCallbackURL } from "@/features/auth/resolve-auth-callback-url/resolve-auth-callback-url";
import {
  listEnabledSocialProviderIds,
  listEnabledSocialProviderUi,
} from "@/features/auth/social-sign-in/social-provider-ui";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getSession();
  const { next } = await searchParams;
  const callbackURL = resolveAuthCallbackURL({ next });
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

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "@/features/auth/sign-in-form/sign-in-form";
import { SignUpForm } from "@/features/auth/sign-up-form/sign-up-form";
import type { SocialProviderId } from "@/features/auth/social-sign-in/social-provider-ui";
import { SocialSignInButtons } from "@/features/auth/social-sign-in/social-sign-in-buttons";

type LoginViewProps = {
  callbackURL: string;
  signUpAllowed: boolean;
  sendsVerificationEmail: boolean;
  requiresEmailVerification: boolean;
  socialProviders: Array<{
    id: SocialProviderId;
    label: string;
    iconSrc?: string;
  }>;
};

export function LoginView({
  callbackURL,
  signUpAllowed,
  sendsVerificationEmail,
  requiresEmailVerification,
  socialProviders,
}: LoginViewProps) {
  const canSignUp = signUpAllowed;
  const hasSocial = socialProviders.length > 0;

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="border-border/70 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">ログイン</CardTitle>
          <CardDescription>
            メールとパスワード、または SSO でログインできます。ログイン後は Lab から Studio
            を開きます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {hasSocial ? (
            <>
              <SocialSignInButtons callbackURL={callbackURL} providers={socialProviders} />
              <div className="flex items-center gap-3">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">または</span>
                <Separator className="flex-1" />
              </div>
            </>
          ) : null}

          {canSignUp ? (
            <Tabs defaultValue="sign-in">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">ログイン</TabsTrigger>
                <TabsTrigger value="sign-up">新規登録</TabsTrigger>
              </TabsList>
              <TabsContent value="sign-in" className="mt-4">
                <SignInForm callbackURL={callbackURL} />
              </TabsContent>
              <TabsContent value="sign-up" className="mt-4">
                <SignUpForm
                  callbackURL={callbackURL}
                  sendsVerificationEmail={sendsVerificationEmail}
                  requiresEmailVerification={requiresEmailVerification}
                />
              </TabsContent>
            </Tabs>
          ) : (
            <SignInForm callbackURL={callbackURL} />
          )}

          <p className="text-center text-sm text-muted-foreground">
            <Link href="/lab" className="hover:text-primary">
              Lab に戻る
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

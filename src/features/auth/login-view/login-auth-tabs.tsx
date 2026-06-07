"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignInForm } from "@/features/auth/sign-in-form/sign-in-form";
import { SignUpForm } from "@/features/auth/sign-up-form/sign-up-form";

type LoginAuthTabsProps = {
  callbackURL: string;
  sendsVerificationEmail: boolean;
  requiresEmailVerification: boolean;
};

export function LoginAuthTabs({
  callbackURL,
  sendsVerificationEmail,
  requiresEmailVerification,
}: LoginAuthTabsProps) {
  const [tab, setTab] = useState("sign-in");

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="sign-in">ログイン</TabsTrigger>
        <TabsTrigger value="sign-up">新規登録</TabsTrigger>
      </TabsList>
      <div className="mt-4">
        {tab === "sign-in" ? (
          <SignInForm callbackURL={callbackURL} />
        ) : (
          <SignUpForm
            callbackURL={callbackURL}
            sendsVerificationEmail={sendsVerificationEmail}
            requiresEmailVerification={requiresEmailVerification}
          />
        )}
      </div>
    </Tabs>
  );
}

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  isEmailVerificationRequired,
  shouldSendVerificationOnSignUp,
} from "@/features/auth/auth-email-env";
import { getTrustedOrigins, isSignUpAllowed } from "@/features/auth/auth-env";
import { buildSocialProviders } from "@/features/auth/build-social-providers/build-social-providers";
import { passwordPolicyLimits } from "@/features/auth/password-policy/password-policy";
import { sendPasswordResetEmailContent } from "@/features/auth/send-auth-email/send-password-reset-email";
import { sendVerificationEmailContent } from "@/features/auth/send-auth-email/send-verification-email";

const authSecret = process.env.BETTER_AUTH_SECRET;
const authBaseUrl = process.env.BETTER_AUTH_URL;

if (!authSecret) {
  throw new Error("BETTER_AUTH_SECRET is required");
}

if (!authBaseUrl) {
  throw new Error("BETTER_AUTH_URL is required");
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: authSecret,
  baseURL: authBaseUrl,
  trustedOrigins: getTrustedOrigins(),
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmailContent({ email: user.email, url });
    },
    sendOnSignUp: shouldSendVerificationOnSignUp(),
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: !isSignUpAllowed(),
    minPasswordLength: passwordPolicyLimits.minLength,
    maxPasswordLength: passwordPolicyLimits.maxLength,
    autoSignIn: !isEmailVerificationRequired(),
    requireEmailVerification: isEmailVerificationRequired(),
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmailContent({ email: user.email, url });
    },
  },
  socialProviders: buildSocialProviders(),
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
  },
  plugins: [nextCookies()],
});

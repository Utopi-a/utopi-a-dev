import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { isEmailVerificationRequired } from "@/features/auth/auth-email-env";
import { getTrustedOrigins, isSignUpAllowed } from "@/features/auth/auth-env";
import { buildSocialProviders } from "@/features/auth/build-social-providers/build-social-providers";
import { sendAuthEmail } from "@/features/auth/send-auth-email/send-auth-email";

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
      await sendAuthEmail({
        to: user.email,
        subject: "メールアドレスの確認",
        text: `以下のリンクからメールアドレスを確認してください。\n\n${url}`,
        html: `<p>以下のリンクからメールアドレスを確認してください。</p><p><a href="${url}">${url}</a></p>`,
      });
    },
    sendOnSignUp: isEmailVerificationRequired(),
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: !isSignUpAllowed(),
    minPasswordLength: 12,
    maxPasswordLength: 128,
    autoSignIn: !isEmailVerificationRequired(),
    requireEmailVerification: isEmailVerificationRequired(),
    sendResetPassword: async ({ user, url }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "パスワードの再設定",
        text: `以下のリンクからパスワードを再設定してください。\n\n${url}`,
        html: `<p>以下のリンクからパスワードを再設定してください。</p><p><a href="${url}">${url}</a></p>`,
      });
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

import { buildAuthEmailHtml } from "@/features/auth/send-auth-email/build-auth-email-html";
import { sendAuthEmail } from "@/features/auth/send-auth-email/send-auth-email";

type SendVerificationEmailParams = {
  email: string;
  url: string;
};

export async function sendVerificationEmailContent({ email, url }: SendVerificationEmailParams) {
  const subject = "メールアドレスの確認";
  const text = `utopi-a.dev です。以下のリンクからメールアドレスを確認してください。\n\n${url}`;
  const html = buildAuthEmailHtml({
    title: "メールアドレスの確認",
    body: "アカウント作成ありがとうございます。次のボタンからメールアドレスを確認してください。",
    actionLabel: "メールアドレスを確認",
    actionUrl: url,
  });

  await sendAuthEmail({ to: email, subject, text, html });
}

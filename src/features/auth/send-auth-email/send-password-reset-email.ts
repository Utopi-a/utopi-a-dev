import { buildAuthEmailHtml } from "@/features/auth/send-auth-email/build-auth-email-html";
import { sendAuthEmail } from "@/features/auth/send-auth-email/send-auth-email";

type SendPasswordResetEmailParams = {
  email: string;
  url: string;
};

export async function sendPasswordResetEmailContent({ email, url }: SendPasswordResetEmailParams) {
  const subject = "パスワードの再設定";
  const text = `utopi-a.dev です。以下のリンクからパスワードを再設定してください。リンクの有効期限があります。\n\n${url}`;
  const html = buildAuthEmailHtml({
    title: "パスワードの再設定",
    body: "パスワード再設定のリクエストを受け付けました。心当たりがある場合のみ、次のボタンから続行してください。",
    actionLabel: "パスワードを再設定",
    actionUrl: url,
  });

  await sendAuthEmail({ to: email, subject, text, html });
}

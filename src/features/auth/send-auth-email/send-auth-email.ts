type SendAuthEmailParams = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendAuthEmail({ to, subject, text, html }: SendAuthEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV === "development") {
      console.info(`[auth-email] ${subject} → ${to}\n${text}`);
    }
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend failed (${response.status}): ${body}`);
  }
}

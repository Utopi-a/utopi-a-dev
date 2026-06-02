type BuildAuthEmailHtmlParams = {
  title: string;
  body: string;
  actionLabel: string;
  actionUrl: string;
};

export function buildAuthEmailHtml({
  title,
  body,
  actionLabel,
  actionUrl,
}: BuildAuthEmailHtmlParams) {
  return `<!DOCTYPE html>
<html lang="ja">
  <body style="font-family: system-ui, sans-serif; line-height: 1.6; color: #111;">
    <div style="max-width: 32rem; margin: 0 auto; padding: 1.5rem;">
      <p style="font-size: 0.875rem; color: #666;">utopi-a.dev</p>
      <h1 style="font-size: 1.25rem; margin: 1rem 0;">${title}</h1>
      <p>${body}</p>
      <p style="margin: 1.5rem 0;">
        <a href="${actionUrl}" style="display: inline-block; padding: 0.625rem 1rem; background: #111; color: #fff; text-decoration: none; border-radius: 0.5rem;">
          ${actionLabel}
        </a>
      </p>
      <p style="font-size: 0.75rem; color: #666;">ボタンが開けない場合は次の URL をブラウザに貼り付けてください。<br /><a href="${actionUrl}">${actionUrl}</a></p>
    </div>
  </body>
</html>`;
}

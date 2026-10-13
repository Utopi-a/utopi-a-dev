/**
 * ログイン後に `next` の画面へ戻るログイン画面の URL。
 * `restore` は開いたタブの保存待ちの記録を指すため、別のタブへは引き継がない。
 */
export function buildLoginHref({ next }: { next: string }): string {
  const url = new URL(next, "http://ammo-ledger.local");
  url.searchParams.delete("restore");
  return `/login?${new URLSearchParams({ next: `${url.pathname}${url.search}` })}`;
}

/**
 * 帳簿の画面から送られた Server Action の POST か。
 * 帳簿の Server Action はすべて自前でログインを確認し、未ログインなら保存できない理由を結果で返す。
 * proxy がここでログイン画面へ転送すると、その結果が画面に届かず「保存できたか確認できない」扱いになるため、
 * 認証の判定はアクションに任せる。
 */
export function isAmmoLedgerServerActionRequest({
  pathname,
  method,
  headers,
}: {
  pathname: string;
  method: string;
  headers: Headers;
}): boolean {
  return (
    method === "POST" &&
    headers.has("next-action") &&
    (pathname === "/lab/ammo-ledger" || pathname.startsWith("/lab/ammo-ledger/"))
  );
}

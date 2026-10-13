export const returnToSearchParam = "returnTo";

const allowedPathPrefix = "/lab/ammo-ledger/";
// 相対 URL の解決にだけ使う。この origin のまま残った値だけを同一サイト内のパスとみなす。
const resolutionBase = "https://ammo-ledger.invalid";

/**
 * 設定画面から記録画面へ戻るリンク先を検証する。
 * 外部サイトへ誘導されないよう、帳簿アプリ内のパスに正規化できる値だけを返す。
 */
export function resolveReturnToPath({
  value,
}: {
  value: string | string[] | undefined | null;
}): string | null {
  if (typeof value !== "string" || !value.startsWith(allowedPathPrefix)) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(value, resolutionBase);
  } catch {
    return null;
  }

  if (
    url.origin !== resolutionBase ||
    !url.pathname.startsWith(allowedPathPrefix) ||
    url.pathname.includes("//")
  ) {
    return null;
  }

  return `${url.pathname}${url.search}`;
}

export function buildPathWithReturnTo({
  path,
  returnTo,
}: {
  path: string;
  returnTo: string;
}): string {
  return `${path}?${new URLSearchParams({ [returnToSearchParam]: returnTo })}`;
}

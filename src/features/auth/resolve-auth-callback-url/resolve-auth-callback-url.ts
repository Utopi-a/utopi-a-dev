const fallbackCallbackURL = "/lab";
const sameOriginBase = "http://callback.invalid";

export function resolveAuthCallbackURL({ next }: { next?: string }) {
  if (!next?.startsWith("/")) {
    return fallbackCallbackURL;
  }
  // ブラウザは `/\evil.example` やタブ・改行入りの `/` を別オリジンとして解釈するため、
  // 先頭の文字だけでなく URL として解決した結果が同じオリジンに留まるかで判定する。
  const url = new URL(next, sameOriginBase);
  if (url.origin !== sameOriginBase) {
    return fallbackCallbackURL;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

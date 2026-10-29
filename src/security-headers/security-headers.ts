export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // マイクとカメラは Lab のゆーとぴあちゃん（/lab/utopia）で使う（口パク・声で話しかける・カメラで一緒に見る）。
  // Permissions-Policy は最初に読み込んだページのものが効き続けるので、そのページだけ許可すると、
  // サイト内リンクで移動したときに使えない。同じオリジンに限ってサイト全体で許可する（外部のフレームやサイトには許可しない）
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
] as const;

export function buildSecurityHeaderRoutes() {
  return [
    {
      source: "/(.*)",
      headers: [...securityHeaders],
    },
  ];
}

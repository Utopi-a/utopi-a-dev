export const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
] as const;

/** マイクを使うページ。全体では禁止しているマイクを、同じオリジンに限って許可する */
const microphonePages = ["/lab/utopia"] as const;

export function buildSecurityHeaderRoutes() {
  return [
    {
      source: "/(.*)",
      headers: [...securityHeaders],
    },
    // 後に書いたルートの同名ヘッダーが優先される
    ...microphonePages.map((source) => ({
      source,
      headers: [
        { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=()" },
      ],
    })),
  ];
}

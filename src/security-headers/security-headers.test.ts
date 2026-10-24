import { describe, expect, it } from "vitest";
import { buildSecurityHeaderRoutes, securityHeaders } from "@/security-headers/security-headers";

describe("securityHeaders", () => {
  it("主要なセキュリティヘッダーを含む", () => {
    const keys = securityHeaders.map((header) => header.key);

    expect(keys).toEqual([
      "X-Frame-Options",
      "X-Content-Type-Options",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ]);
  });

  it("クリックジャッキング対策として DENY を設定する", () => {
    const frameOptions = securityHeaders.find((header) => header.key === "X-Frame-Options");
    expect(frameOptions?.value).toBe("DENY");
  });
});

describe("buildSecurityHeaderRoutes", () => {
  it("全ルートにヘッダーを適用する設定を返す", () => {
    const routes = buildSecurityHeaderRoutes();

    expect(routes[0]?.source).toBe("/(.*)");
    expect(routes[0]?.headers).toHaveLength(securityHeaders.length);
  });

  it("マイクはゆーとぴあちゃんのページだけ同じオリジンに許可する", () => {
    const routes = buildSecurityHeaderRoutes();
    const utopia = routes.find((route) => route.source === "/lab/utopia");

    expect(utopia?.headers).toContainEqual({
      key: "Permissions-Policy",
      value: "camera=(), microphone=(self), geolocation=()",
    });
    expect(routes.at(-1)).toBe(utopia);
  });
});

import { describe, expect, it } from "vitest";
import { stripUrlQueryAndHash } from "./strip-url-query-and-hash";

describe("stripUrlQueryAndHash", () => {
  it("パスワード再設定のトークンを計測に送らない", () => {
    const result = stripUrlQueryAndHash({
      event: { type: "pageview", url: "https://www.utopi-a.dev/reset-password?token=secret-token" },
    });

    expect(result).toEqual({ type: "pageview", url: "https://www.utopi-a.dev/reset-password" });
  });

  it("ハッシュも落とす", () => {
    const result = stripUrlQueryAndHash({
      event: { type: "pageview", url: "https://www.utopi-a.dev/blog?page=2#comments" },
    });

    expect(result.url).toBe("https://www.utopi-a.dev/blog");
  });

  it("クエリのない URL はそのまま返す", () => {
    const result = stripUrlQueryAndHash({
      event: { type: "pageview", url: "https://www.utopi-a.dev/lab" },
    });

    expect(result.url).toBe("https://www.utopi-a.dev/lab");
  });
});

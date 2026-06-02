import { describe, expect, it } from "vitest";
import { buildAuthEmailHtml } from "@/features/auth/send-auth-email/build-auth-email-html";

describe("buildAuthEmailHtml", () => {
  it("アクション URL とラベルを含む", () => {
    const html = buildAuthEmailHtml({
      title: "テスト",
      body: "本文です。",
      actionLabel: "開く",
      actionUrl: "https://example.com/verify?token=abc",
    });

    expect(html).toContain("テスト");
    expect(html).toContain("本文です。");
    expect(html).toContain("開く");
    expect(html).toContain("https://example.com/verify?token=abc");
  });
});

import { describe, expect, it } from "vitest";
import { resolveAuthCallbackURL } from "@/features/auth/resolve-auth-callback-url/resolve-auth-callback-url";

describe("resolveAuthCallbackURL", () => {
  it("相対パスの next をそのまま使う", () => {
    expect(resolveAuthCallbackURL({ next: "/lab/studio" })).toBe("/lab/studio");
  });

  it("next が無いときは /lab", () => {
    expect(resolveAuthCallbackURL({})).toBe("/lab");
  });

  it("プロトコル相対 URL は拒否して /lab", () => {
    expect(resolveAuthCallbackURL({ next: "//evil.example" })).toBe("/lab");
  });

  it("絶対 URL は拒否して /lab", () => {
    expect(resolveAuthCallbackURL({ next: "https://evil.example" })).toBe("/lab");
  });

  it("クエリ付きの相対パスは戻り先として保つ", () => {
    expect(resolveAuthCallbackURL({ next: "/lab/ammo-ledger/ledger?entry=abc" })).toBe(
      "/lab/ammo-ledger/ledger?entry=abc",
    );
  });

  it("バックスラッシュで別オリジンになる next は拒否して /lab", () => {
    expect(resolveAuthCallbackURL({ next: "/\\evil.example" })).toBe("/lab");
  });

  it("タブを挟んで別オリジンになる next は拒否して /lab", () => {
    expect(resolveAuthCallbackURL({ next: "/\t/evil.example" })).toBe("/lab");
  });
});

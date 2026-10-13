import { describe, expect, it } from "vitest";
import { resolveAuthCallbackURL } from "@/features/auth/resolve-auth-callback-url/resolve-auth-callback-url";
import { buildLoginHref } from "./build-login-href";

function readNext({ href }: { href: string }) {
  return new URL(href, "http://ammo-ledger.local").searchParams.get("next") ?? undefined;
}

describe("buildLoginHref", () => {
  it("ログイン画面が戻り先として受け付ける形で今の画面を渡す", () => {
    const href = buildLoginHref({ next: "/lab/ammo-ledger/ledger?year=2026" });

    expect(href.startsWith("/login?next=")).toBe(true);
    expect(resolveAuthCallbackURL({ next: readNext({ href }) })).toBe(
      "/lab/ammo-ledger/ledger?year=2026",
    );
  });

  it("入力に戻るための restore は戻り先に含めない", () => {
    const href = buildLoginHref({
      next: "/lab/ammo-ledger/consume/new?restore=change-1&draft=draft-1",
    });

    expect(readNext({ href })).toBe("/lab/ammo-ledger/consume/new?draft=draft-1");
  });
});

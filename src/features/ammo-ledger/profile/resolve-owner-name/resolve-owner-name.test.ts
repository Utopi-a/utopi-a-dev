import { describe, expect, it } from "vitest";
import { resolveOwnerName } from "./resolve-owner-name";

describe("resolveOwnerName", () => {
  it("プロフィールの氏名を優先する", () => {
    expect(resolveOwnerName({ profileOwnerName: "山田 太郎", accountName: "yamada" })).toBe(
      "山田 太郎",
    );
  });

  it("未設定ならアカウント名にフォールバックする", () => {
    expect(resolveOwnerName({ profileOwnerName: null, accountName: "yamada" })).toBe("yamada");
    expect(resolveOwnerName({ profileOwnerName: "  ", accountName: "yamada" })).toBe("yamada");
  });
});

import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import { runCompanionTool } from "@/features/utopia-companion/companion-tool";
import { SITE_TOOLS } from "@/features/utopia-companion/tools/site-tools";

const context = () => ({
  fetch: vi.fn<typeof globalThis.fetch>(),
  storage: createMemoryStorage(),
  now: new Date(),
});

describe("site tools", () => {
  it("ページの一覧に、ナビゲーションと Lab のアプリを並べる", async () => {
    const result = await runCompanionTool({
      call: { id: "c", name: "list_site_pages", arguments: {} },
      tools: SITE_TOOLS,
      context: context(),
    });
    expect(result).toMatch(/^成功: \/ トップ: /);
    expect(result).toContain("/work Works: 制作物の一覧");
    expect(result).toContain("/lab/utopia ゆーとぴあちゃん: ");
    expect(result).toContain("/lab/local-llm ローカル LLM チャット: ");
  });

  it("ページの内容を、サイトに表示しているデータから返す", async () => {
    const result = await runCompanionTool({
      call: { id: "c", name: "read_site_page", arguments: { path: "/work" } },
      tools: SITE_TOOLS,
      context: context(),
    });
    expect(result).toContain(
      "実包管理帳簿（/lab/ammo-ledger）: 猟銃実包の消費・譲受記録と法定帳簿出力。",
    );
  });

  it("ないページは、あるパスを添えて失敗として返す", async () => {
    const result = await runCompanionTool({
      call: { id: "c", name: "read_site_page", arguments: { path: "/shop" } },
      tools: SITE_TOOLS,
      context: context(),
    });
    expect(result).toMatch(
      /^失敗: read_site_page（\/shop というページはない。あるのは \/、\/about、/,
    );
  });

  it("サイトの話のときだけ渡す", () => {
    expect(SITE_TOOLS[0].isRelevant?.("このサイトって何があるの？")).toBe(true);
    expect(SITE_TOOLS[0].isRelevant?.("やっほー")).toBe(false);
  });
});

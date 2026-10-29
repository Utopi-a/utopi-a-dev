import { describe, expect, it, vi } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import {
  defineTool,
  runCompanionTool,
  selectCompanionTools,
} from "@/features/utopia-companion/companion-tool";

const context = () => ({
  fetch: vi.fn<typeof globalThis.fetch>(),
  storage: createMemoryStorage(),
  now: new Date("2026-10-29T10:00:00+09:00"),
});

const echo = defineTool({
  name: "echo",
  description: "受け取った言葉を返す",
  parameters: { word: "返す言葉" },
  describe: ({ word }) => `${word} を返してる…`,
  run: async ({ word }) => `${word}!`,
  isRelevant: (userText) => userText.includes("こだま"),
});

describe("runCompanionTool", () => {
  it("確かめてから実行し、結果を「成功」として返す", async () => {
    expect(
      await runCompanionTool({
        call: { id: "c", name: "echo", arguments: { word: "やあ" } },
        tools: [echo],
        context: context(),
      }),
    ).toBe("成功: やあ!");
  });

  it("知らない名前や空の引数は、実行せずに直し方の分かる失敗として返す", async () => {
    const run = vi.fn();
    const tool = { ...echo, run };
    expect(
      await runCompanionTool({
        call: { id: "c", name: "shout", arguments: {} },
        tools: [tool],
        context: context(),
      }),
    ).toBe("失敗: shout という道具はない。使える道具は echo。");
    expect(
      await runCompanionTool({
        call: { id: "c", name: "echo", arguments: { word: " " } },
        tools: [tool],
        context: context(),
      }),
    ).toBe("失敗: echo の word が空。");
    expect(run).not.toHaveBeenCalled();
  });

  it("道具の例外は失敗として返し、取りやめのときだけ例外を投げる", async () => {
    const broken = { ...echo, run: async () => Promise.reject(new Error("HTTP 429")) };
    expect(
      await runCompanionTool({
        call: { id: "c", name: "echo", arguments: { word: "x" } },
        tools: [broken],
        context: context(),
      }),
    ).toBe("失敗: echo（HTTP 429）。");

    const controller = new AbortController();
    controller.abort();
    await expect(
      runCompanionTool({
        call: { id: "c", name: "echo", arguments: { word: "x" } },
        tools: [broken],
        context: { ...context(), signal: controller.signal },
      }),
    ).rejects.toThrow("HTTP 429");
  });

  it("長い結果は切り詰める", async () => {
    const long = { ...echo, run: async () => "あ".repeat(2000) };
    const result = await runCompanionTool({
      call: { id: "c", name: "echo", arguments: { word: "x" } },
      tools: [long],
      context: context(),
    });
    expect(result).toBe(`成功: ${"あ".repeat(1500)}…`);
  });
});

describe("selectCompanionTools", () => {
  it("相手の発言に関係のある道具だけを選び、条件のない道具は毎回選ぶ", () => {
    const always = defineTool({
      name: "always",
      description: "",
      parameters: {},
      describe: () => "",
      run: async () => "",
    });
    expect(
      selectCompanionTools({ tools: [echo, always], userText: "やあ" }).map(
        (tool) => tool.definition.function.name,
      ),
    ).toEqual(["always"]);
    expect(
      selectCompanionTools({ tools: [echo, always], userText: "こだまして" }).map(
        (tool) => tool.definition.function.name,
      ),
    ).toEqual(["echo", "always"]);
  });
});

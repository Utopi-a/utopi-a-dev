import { describe, expect, it } from "vitest";
import { createMemoryStorage } from "@/features/utopia-companion/companion-test-storage";
import {
  clearWebSearchSettings,
  readWebSearchSettings,
  writeWebSearchSettings,
} from "@/features/utopia-companion/web-search/web-search-settings";

describe("web search settings", () => {
  it("キーは前後の空白を除いて保存し、消せる", () => {
    const storage = createMemoryStorage();
    writeWebSearchSettings({ storage, settings: { provider: "exa", apiKey: " exa-key " } });
    expect(readWebSearchSettings({ storage })).toEqual({ provider: "exa", apiKey: "exa-key" });
    clearWebSearchSettings({ storage });
    expect(readWebSearchSettings({ storage })).toBeNull();
  });

  it("知らない検索先や壊れた保存内容は、設定なしとして扱う", () => {
    const storage = createMemoryStorage();
    storage.setItem(
      "utopia-companion.web-search.v1",
      JSON.stringify({ provider: "bing", apiKey: "x" }),
    );
    expect(readWebSearchSettings({ storage })).toBeNull();
    storage.setItem("utopia-companion.web-search.v1", "{壊れた");
    expect(readWebSearchSettings({ storage })).toBeNull();
  });
});

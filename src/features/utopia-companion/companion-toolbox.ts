import type { CompanionTool } from "@/features/utopia-companion/companion-tool";
import { KNOWLEDGE_TOOLS } from "@/features/utopia-companion/tools/knowledge-tools";
import { MEMORY_TOOLS } from "@/features/utopia-companion/tools/memory-tools";
import { SITE_TOOLS } from "@/features/utopia-companion/tools/site-tools";
import { UTILITY_TOOLS } from "@/features/utopia-companion/tools/utility-tools";
import type { WebSearchSettings } from "@/features/utopia-companion/web-search/web-search-settings";
import { createWebSearchTool } from "@/features/utopia-companion/web-search/web-search-tool";

/**
 * ゆーとぴあちゃんが使える道具の一覧。道具を足すときはここに加える。
 * ネット検索は、使う人が API キーを入れたときだけ加える
 */
export function buildCompanionTools({
  webSearch,
}: {
  webSearch: WebSearchSettings | null;
}): CompanionTool[] {
  return [
    ...(webSearch ? [createWebSearchTool({ settings: webSearch })] : []),
    ...KNOWLEDGE_TOOLS,
    ...SITE_TOOLS,
    ...UTILITY_TOOLS,
    ...MEMORY_TOOLS,
  ];
}

export const COMPANION_TOOLS = buildCompanionTools({ webSearch: null });

import { KNOWLEDGE_TOOLS } from "@/features/utopia-companion/tools/knowledge-tools";
import { MEMORY_TOOLS } from "@/features/utopia-companion/tools/memory-tools";

/** ゆーとぴあちゃんが使える道具の一覧。道具を足すときはここに加える */
export const COMPANION_TOOLS = [...KNOWLEDGE_TOOLS, ...MEMORY_TOOLS];

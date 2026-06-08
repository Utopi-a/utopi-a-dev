import { PublicPageShell } from "@/components/layout/public-page-shell";
import { LocalLlmChatView } from "@/features/local-llm/local-llm-chat-view/local-llm-chat-view";

export default function LocalLlmLabPage() {
  return (
    <PublicPageShell width="content">
      <LocalLlmChatView />
    </PublicPageShell>
  );
}

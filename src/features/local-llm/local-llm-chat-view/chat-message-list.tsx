import type { RefObject } from "react";
import { ChatImagePreview } from "@/features/local-llm/local-llm-chat-view/chat-image-preview";
import type { ChatMessage } from "@/features/local-llm/local-llm-chat-view/chat-message-types";
import { cn } from "@/lib/cn";

type ChatMessageListProps = {
  messages: ChatMessage[];
  isGenerating: boolean;
  containerRef: RefObject<HTMLDivElement | null>;
};

export function ChatMessageList({ messages, isGenerating, containerRef }: ChatMessageListProps) {
  return (
    <div
      ref={containerRef}
      className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border/70 bg-card/50 p-4 sm:p-6"
    >
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex max-w-[90%] flex-col gap-2",
            message.role === "user" ? "ml-auto items-end" : "items-start",
          )}
        >
          {message.images?.length ? (
            <div className="flex flex-wrap justify-end gap-2">
              {message.images.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-lg border border-border/70">
                  <ChatImagePreview
                    src={image.dataUrl}
                    alt={image.name}
                    className="max-h-40 max-w-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
          <div
            className={cn(
              "rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
              message.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground",
            )}
          >
            {message.content || (isGenerating && message.id === messages.at(-1)?.id ? "…" : "")}
          </div>
        </div>
      ))}
    </div>
  );
}

import type { RefObject } from "react";
import { ChatAudioChip } from "@/features/local-llm/local-llm-chat-view/chat-audio-chip";
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
      {messages.map((message) => {
        const isPending = isGenerating && message.id === messages.at(-1)?.id;
        // 音声だけの発言や、音声だけで返した返答には吹き出しを出さない
        const hasBubble =
          message.content.length > 0 ||
          (message.role === "assistant" && isPending && !message.spokenSeconds);

        return (
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
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-lg border border-border/70"
                  >
                    <ChatImagePreview
                      src={image.dataUrl}
                      alt={image.name}
                      className="max-h-40 max-w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            ) : null}
            {message.audio?.length ? (
              <div className="flex flex-wrap justify-end gap-2">
                {message.audio.map((clip) => (
                  <ChatAudioChip key={clip.id} clip={clip} />
                ))}
              </div>
            ) : null}
            {message.spokenSeconds ? (
              <ChatAudioChip clip={{ name: "音声で返答", seconds: message.spokenSeconds }} />
            ) : null}
            {hasBubble ? (
              <div
                className={cn(
                  "rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground",
                )}
              >
                {message.content || (isPending ? "…" : "")}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

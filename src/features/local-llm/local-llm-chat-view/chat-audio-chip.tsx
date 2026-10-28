import { AudioLinesIcon, XIcon } from "lucide-react";
import type { ChatAudioClip } from "@/features/local-llm/local-llm-chat-view/chat-message-types";

type ChatAudioChipProps = {
  clip: Pick<ChatAudioClip, "name" | "seconds">;
  onRemove?: () => void;
};

export function ChatAudioChip({ clip, onRemove }: ChatAudioChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs">
      <AudioLinesIcon className="size-3.5" />
      <span className="max-w-40 truncate">{clip.name}</span>
      <span className="tabular-nums text-muted-foreground">{clip.seconds.toFixed(1)} 秒</span>
      {onRemove ? (
        <button
          type="button"
          aria-label="音声を削除"
          className="-mr-1 rounded-full p-0.5 hover:bg-muted"
          onClick={onRemove}
        >
          <XIcon className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

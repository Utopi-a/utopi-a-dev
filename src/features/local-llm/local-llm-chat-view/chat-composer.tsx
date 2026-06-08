"use client";

import { ImagePlusIcon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChatImagePreview } from "@/features/local-llm/local-llm-chat-view/chat-image-preview";
import type { ChatImageAttachment } from "@/features/local-llm/local-llm-chat-view/chat-message-types";
import { readImageFile } from "@/features/local-llm/local-llm-chat-view/read-image-file";

type ChatComposerProps = {
  disabled?: boolean;
  isGenerating?: boolean;
  supportsImages?: boolean;
  onSubmit: (args: { message: string; images: ChatImageAttachment[] }) => void;
  onInterrupt?: () => void;
};

function resizeTextarea({ textarea }: { textarea: HTMLTextAreaElement }) {
  textarea.style.height = "auto";
  const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 200);
  textarea.style.height = `${newHeight}px`;
}

export function ChatComposer({
  disabled = false,
  isGenerating = false,
  supportsImages = false,
  onSubmit,
  onInterrupt,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<ChatImageAttachment[]>([]);

  function trySubmit() {
    const trimmed = input.trim();
    const hasContent = trimmed.length > 0 || pendingImages.length > 0;
    if (!hasContent || disabled || isGenerating) {
      return;
    }

    onSubmit({ message: trimmed, images: pendingImages });
    setInput("");
    setPendingImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  async function handleImageSelection({ files }: { files: FileList | null }) {
    if (!files?.length) {
      return;
    }

    const attachments = await Promise.all(Array.from(files).map((file) => readImageFile({ file })));
    setPendingImages((prev) => [...prev, ...attachments]);
  }

  return (
    <div className="space-y-2">
      {pendingImages.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingImages.map((image) => (
            <div key={image.id} className="relative">
              <ChatImagePreview
                src={image.dataUrl}
                alt={image.name}
                className="h-20 w-20 rounded-lg border border-border/70 object-cover"
              />
              <button
                type="button"
                aria-label="画像を削除"
                className="absolute -top-2 -right-2 rounded-full border border-border bg-background p-1 shadow-sm"
                onClick={() =>
                  setPendingImages((prev) => prev.filter((item) => item.id !== image.id))
                }
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-card/70 p-3">
        {supportsImages ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                void handleImageSelection({ files: event.target.files });
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="画像を添付"
              disabled={disabled || isGenerating}
              onClick={() => fileInputRef.current?.click()}
            >
              <ImagePlusIcon className="size-4" />
            </Button>
          </>
        ) : null}

        <Textarea
          ref={textareaRef}
          value={input}
          rows={1}
          placeholder="メッセージを入力…"
          className="min-h-6 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          disabled={disabled || isGenerating}
          onCompositionStart={() => {
            isComposingRef.current = true;
          }}
          onCompositionEnd={() => {
            isComposingRef.current = false;
          }}
          onChange={(event) => {
            setInput(event.target.value);
            if (textareaRef.current) {
              resizeTextarea({ textarea: textareaRef.current });
            }
          }}
          onKeyDown={(event) => {
            if (event.key !== "Enter") {
              return;
            }

            if (event.nativeEvent.isComposing || isComposingRef.current) {
              return;
            }

            if (!(event.metaKey || event.ctrlKey)) {
              return;
            }

            event.preventDefault();
            trySubmit();
          }}
        />

        {isGenerating ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="生成を停止"
            onClick={onInterrupt}
          >
            <SquareIcon className="size-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            aria-label="送信"
            disabled={disabled || (input.trim().length === 0 && pendingImages.length === 0)}
            onClick={trySubmit}
          >
            <SendIcon className="size-4" />
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
          ? "⌘"
          : "Ctrl"}
        +Enter で送信 · Enter で改行
        {supportsImages ? " · 画像を添付できます" : ""}
      </p>
    </div>
  );
}

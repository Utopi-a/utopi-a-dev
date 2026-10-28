"use client";

import { FileAudioIcon, ImagePlusIcon, MicIcon, SendIcon, SquareIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LocalLlmReplyMode } from "@/features/local-llm/inference-worker/inference-worker-messages";
import { ChatAudioChip } from "@/features/local-llm/local-llm-chat-view/chat-audio-chip";
import { ChatImagePreview } from "@/features/local-llm/local-llm-chat-view/chat-image-preview";
import type {
  ChatAudioClip,
  ChatImageAttachment,
} from "@/features/local-llm/local-llm-chat-view/chat-message-types";
import { readAudioFile } from "@/features/local-llm/local-llm-chat-view/read-audio-file";
import { readImageFile } from "@/features/local-llm/local-llm-chat-view/read-image-file";
import { ReplyModeSelector } from "@/features/local-llm/local-llm-chat-view/reply-mode-selector";

type ChatComposerProps = {
  disabled?: boolean;
  isGenerating?: boolean;
  supportsImages?: boolean;
  supportsAudio?: boolean;
  replyMode: LocalLlmReplyMode;
  onReplyModeChange: (replyMode: LocalLlmReplyMode) => void;
  onSubmit: (args: {
    message: string;
    images: ChatImageAttachment[];
    audio: ChatAudioClip[];
  }) => void;
  onInterrupt?: () => void;
  onError: (message: string) => void;
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
  supportsAudio = false,
  replyMode,
  onReplyModeChange,
  onSubmit,
  onInterrupt,
  onError,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const isComposingRef = useRef(false);

  const [input, setInput] = useState("");
  const [pendingImages, setPendingImages] = useState<ChatImageAttachment[]>([]);
  const [pendingAudio, setPendingAudio] = useState<ChatAudioClip[]>([]);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => () => recorderRef.current?.stop(), []);

  const hasContent = input.trim().length > 0 || pendingImages.length > 0 || pendingAudio.length > 0;

  function trySubmit() {
    if (!hasContent || disabled || isGenerating || isRecording) {
      return;
    }

    onSubmit({ message: input.trim(), images: pendingImages, audio: pendingAudio });
    setInput("");
    setPendingImages([]);
    setPendingAudio([]);
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

  async function addAudio({ file, name }: { file: Blob; name: string }) {
    try {
      const clip = await readAudioFile({ file, name });
      setPendingAudio((prev) => [...prev, clip]);
    } catch (error) {
      onError(
        `${name} を読み込めませんでした（${error instanceof Error ? error.message : error}）`,
      );
    }
  }

  async function toggleRecording() {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = ({ data }) => chunks.push(data);
      recorder.onstop = () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        recorderRef.current = null;
        setIsRecording(false);
        void addAudio({ file: new Blob(chunks, { type: chunks[0]?.type }), name: "録音" });
      };
      recorder.start();
      recorderRef.current = recorder;
      setIsRecording(true);
    } catch (error) {
      onError(`録音できませんでした（${error instanceof Error ? error.message : error}）`);
    }
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

      {pendingAudio.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {pendingAudio.map((clip) => (
            <ChatAudioChip
              key={clip.id}
              clip={clip}
              onRemove={() => setPendingAudio((prev) => prev.filter((item) => item.id !== clip.id))}
            />
          ))}
        </div>
      ) : null}

      {supportsAudio ? (
        <ReplyModeSelector
          replyMode={replyMode}
          disabled={disabled || isGenerating}
          onChange={onReplyModeChange}
        />
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

        {supportsAudio ? (
          <>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              multiple
              className="hidden"
              onChange={(event) => {
                for (const file of Array.from(event.target.files ?? [])) {
                  void addAudio({ file, name: file.name });
                }
                event.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="音声ファイルを添付"
              disabled={disabled || isGenerating || isRecording}
              onClick={() => audioInputRef.current?.click()}
            >
              <FileAudioIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              aria-label={isRecording ? "録音を止める" : "録音する"}
              aria-pressed={isRecording}
              disabled={disabled || isGenerating}
              onClick={() => void toggleRecording()}
            >
              {isRecording ? <SquareIcon className="size-4" /> : <MicIcon className="size-4" />}
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
            disabled={disabled || isRecording || !hasContent}
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
        {supportsImages && supportsAudio
          ? " · 画像と音声を添付できます"
          : supportsImages
            ? " · 画像を添付できます"
            : ""}
      </p>
    </div>
  );
}

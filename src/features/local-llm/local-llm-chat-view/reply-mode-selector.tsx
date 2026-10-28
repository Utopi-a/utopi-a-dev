import { Label } from "@/components/ui/label";
import type { LocalLlmReplyMode } from "@/features/local-llm/inference-worker/inference-worker-messages";
import { cn } from "@/lib/cn";

type ReplyModeSelectorProps = {
  replyMode: LocalLlmReplyMode;
  disabled?: boolean;
  onChange: (replyMode: LocalLlmReplyMode) => void;
};

const MODE_OPTIONS = [
  { value: "text", label: "会話" },
  { value: "transcribe", label: "文字起こし" },
] as const satisfies readonly { value: LocalLlmReplyMode["mode"]; label: string }[];

const LANGUAGE_OPTIONS = [
  { value: "Japanese", label: "日本語" },
  { value: "English", label: "英語" },
] as const;

const selectClassName = cn(
  "h-8 rounded-lg border border-input bg-background px-2 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

export function ReplyModeSelector({
  replyMode,
  disabled = false,
  onChange,
}: ReplyModeSelectorProps) {
  const language = "language" in replyMode ? replyMode.language : "Japanese";

  function changeMode(mode: LocalLlmReplyMode["mode"]) {
    onChange(mode === "transcribe" ? { mode, language } : { mode });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Label htmlFor="local-llm-reply-mode" className="text-muted-foreground">
        モード
      </Label>
      <select
        id="local-llm-reply-mode"
        value={replyMode.mode}
        disabled={disabled}
        className={selectClassName}
        onChange={(event) => changeMode(event.target.value as LocalLlmReplyMode["mode"])}
      >
        {MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {"language" in replyMode ? (
        <select
          aria-label="言語"
          value={replyMode.language}
          disabled={disabled}
          className={selectClassName}
          onChange={(event) =>
            onChange({
              mode: replyMode.mode,
              language: event.target.value as "Japanese" | "English",
            })
          }
        >
          {LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

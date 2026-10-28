"use client";

import { Loader2Icon, SendIcon, SquareIcon } from "lucide-react";
import { type RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { InferenceToolCall } from "@/features/local-llm/inference-worker/inference-worker-messages";
import { useIrodoriVoice } from "@/features/local-llm/irodori-tts/use-irodori-voice";
import { ModelAttribution } from "@/features/local-llm/local-llm-chat-view/model-attribution";
import { VoiceAttribution } from "@/features/local-llm/local-llm-chat-view/voice-attribution";
import { VoiceToggle } from "@/features/local-llm/local-llm-chat-view/voice-toggle";
import { runCompanionTurn } from "@/features/utopia-companion/companion-agent";
import {
  type CompanionHistoryEntry,
  clearCompanionMemory,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import {
  type CompanionExpression,
  parseCompanionReply,
} from "@/features/utopia-companion/companion-reply";
import {
  COMPANION_MODEL,
  useCompanionBrain,
} from "@/features/utopia-companion/use-companion-brain";

/** 読み上げの大きさ（RMS）を口の開き 0〜1 にする範囲 */
const SILENT_RMS = 0.01;
const LOUD_RMS = 0.1;

function describeToolCall({ call }: { call: InferenceToolCall }) {
  switch (call.name) {
    case "search_wikipedia":
      return `ウィキペディアで「${call.arguments.query ?? ""}」を調べてる…`;
    case "read_web_page":
      return "ページを読んでる…";
    case "remember":
      return "覚えてる…";
    default:
      return "考え中…";
  }
}

function megabytes({ bytes }: { bytes: number }) {
  return Math.round(bytes / 1e6).toLocaleString();
}

export function CompanionTalkPanel({
  onReply,
  speechLevelRef,
}: {
  /** 返事の気持ち。キャラクターの表情を変える */
  onReply: (reply: { expression: CompanionExpression }) => void;
  /** 読み上げに合わせて口を動かすため、毎フレーム書き込む */
  speechLevelRef: RefObject<number>;
}) {
  const brain = useCompanionBrain();
  const voice = useIrodoriVoice();
  const [log, setLog] = useState<CompanionHistoryEntry[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const memory = readCompanionMemory({ storage: localStorage });
    setLog(memory.history);
    setNotes(memory.notes);
  }, []);

  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const rms = voice.level();
      speechLevelRef.current = Math.min(
        1,
        Math.max(0, (rms - SILENT_RMS) / (LOUD_RMS - SILENT_RMS)),
      );
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [voice.level, speechLevelRef]);

  async function talk() {
    const userText = draft.trim();
    if (userText.length === 0 || activity) {
      return;
    }
    setDraft("");
    setError(null);
    setActivity("考え中…");
    setLog((prev) => [...prev, { role: "user", content: userText }]);
    voice.stop();
    try {
      const reply = await runCompanionTurn({
        userText,
        generate: brain.generate,
        context: { fetch: window.fetch.bind(window), storage: localStorage },
        now: new Date(),
        onToolCall: (call) => setActivity(describeToolCall({ call })),
      });
      const memory = readCompanionMemory({ storage: localStorage });
      setLog(memory.history);
      setNotes(memory.notes);
      onReply({ expression: reply.expression });
      voice.follow({ messageId: crypto.randomUUID(), text: reply.speech, isFinal: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setActivity(null);
    }
  }

  function forget() {
    const memory = clearCompanionMemory({ storage: localStorage });
    setLog(memory.history);
    setNotes(memory.notes);
  }

  if (brain.state.status !== "awake") {
    return (
      <div className="space-y-3">
        {brain.state.status === "waking" ? (
          <Button type="button" disabled className="w-full">
            <Loader2Icon className="size-4 animate-spin" />
            {brain.state.total > 0 && brain.state.loaded < brain.state.total ? (
              <span className="tabular-nums">
                頭を読み込み中 {megabytes({ bytes: brain.state.loaded })} /{" "}
                {megabytes({ bytes: brain.state.total })} MB
              </span>
            ) : (
              brain.state.message
            )}
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={() => void brain.wake()}>
            ゆーとぴあちゃんを起こす
          </Button>
        )}
        {brain.state.status === "error" ? (
          <p className="text-sm text-destructive">{brain.state.message}</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            初回 {COMPANION_MODEL.estimatedDownload}。会話と記憶はこの端末の中だけで扱います。
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {log.length > 0 ? (
        <ol className="max-h-80 space-y-3 overflow-y-auto text-sm" aria-live="polite">
          {log.map((entry, index) => (
            <li
              // 記憶は追記だけなので、位置で区別してよい
              // biome-ignore lint/suspicious/noArrayIndexKey: 追記だけの記録
              key={index}
              className={
                entry.role === "user"
                  ? "ml-auto w-fit max-w-[85%] rounded-2xl bg-muted px-3 py-2"
                  : "w-fit max-w-[85%] leading-relaxed"
              }
            >
              {entry.role === "user"
                ? entry.content
                : parseCompanionReply({ text: entry.content }).speech}
            </li>
          ))}
        </ol>
      ) : null}

      {activity ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          {activity}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void talk();
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void talk();
            }
          }}
          placeholder="ゆーとぴあちゃんに話しかける…"
          rows={2}
          className="min-h-0 resize-none"
        />
        {activity ? (
          <Button type="button" size="icon" variant="outline" onClick={brain.interrupt}>
            <SquareIcon />
            <span className="sr-only">止める</span>
          </Button>
        ) : (
          <Button type="submit" size="icon" disabled={draft.trim().length === 0}>
            <SendIcon />
            <span className="sr-only">送る</span>
          </Button>
        )}
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <VoiceToggle
          state={voice.state}
          onTurnOn={() => void voice.turnOn()}
          onTurnOff={voice.turnOff}
        />
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">覚えていること（{notes.length}）</summary>
          <ul className="mt-2 space-y-1">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={forget}>
            記憶と会話を消す
          </Button>
        </details>
      </div>

      <div className="space-y-2">
        <ModelAttribution model={COMPANION_MODEL} />
        {voice.state.status !== "off" ? <VoiceAttribution /> : null}
        <p className="text-xs text-muted-foreground">
          調べものをするときだけ、検索する言葉や URL を Wikipedia・Jina Reader に送ります。
        </p>
      </div>
    </div>
  );
}

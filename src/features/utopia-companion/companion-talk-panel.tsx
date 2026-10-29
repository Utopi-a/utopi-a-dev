"use client";

import { Loader2Icon, MicIcon, SendIcon, SquareIcon } from "lucide-react";
import { type RefObject, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useIrodoriVoice } from "@/features/local-llm/irodori-tts/use-irodori-voice";
import { ModelAttribution } from "@/features/local-llm/local-llm-chat-view/model-attribution";
import { VoiceAttribution } from "@/features/local-llm/local-llm-chat-view/voice-attribution";
import { VoiceToggle } from "@/features/local-llm/local-llm-chat-view/voice-toggle";
import { CompanionCameraControl } from "@/features/utopia-companion/camera/companion-camera-control";
import {
  buildSceneMessages,
  buildSceneTurn,
} from "@/features/utopia-companion/camera/companion-scene";
import { useCompanionCamera } from "@/features/utopia-companion/camera/use-companion-camera";
import { useCompanionWatch } from "@/features/utopia-companion/camera/use-companion-watch";
import { type CompanionStep, runCompanionTurn } from "@/features/utopia-companion/companion-agent";
import {
  type CompanionHistoryEntry,
  clearCompanionMemory,
  readCompanionMemory,
} from "@/features/utopia-companion/companion-memory";
import { compactCompanionMemory } from "@/features/utopia-companion/companion-memory-compaction";
import {
  type CompanionExpression,
  parseCompanionReply,
} from "@/features/utopia-companion/companion-reply";
import { splitThinking } from "@/features/utopia-companion/companion-thinking";
import { buildCompanionTools } from "@/features/utopia-companion/companion-toolbox";
import { createCameraTool } from "@/features/utopia-companion/tools/camera-tool";
import {
  type CompanionEarsState,
  useCompanionEars,
} from "@/features/utopia-companion/use-companion-ears";
import {
  COMPANION_MODEL,
  EYES_MODEL,
  useCompanionBrain,
  useCompanionEyes,
} from "@/features/utopia-companion/use-companion-models";
import {
  clearWebSearchSettings,
  readWebSearchSettings,
  type WebSearchSettings,
  writeWebSearchSettings,
} from "@/features/utopia-companion/web-search/web-search-settings";
import { WebSearchSettingsForm } from "@/features/utopia-companion/web-search/web-search-settings-form";

/** 読み上げの大きさ（RMS）を口の開き 0〜1 にする範囲 */
const SILENT_RMS = 0.01;
const LOUD_RMS = 0.1;

function megabytes({ bytes }: { bytes: number }) {
  return Math.round(bytes / 1e6).toLocaleString();
}

function describeEars({ state }: { state: CompanionEarsState }) {
  switch (state.status) {
    case "loading":
      return state.total > 0
        ? `耳を読み込み中 ${megabytes({ bytes: state.loaded })} / ${megabytes({ bytes: state.total })} MB`
        : "耳を読み込み中…";
    case "listening":
      return "聞いてるよ。話し終えたら、もう一度マイクを押してね";
    case "transcribing":
      return "聞き取ってる…";
    default:
      return null;
  }
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
  const [webSearch, setWebSearch] = useState<WebSearchSettings | null>(null);

  useEffect(() => {
    const memory = readCompanionMemory({ storage: localStorage });
    setLog(memory.history);
    setNotes(memory.notes);
    setWebSearch(readWebSearchSettings({ storage: localStorage }));
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

  const ears = useCompanionEars({ onHeard: (text) => void talk({ text }) });
  const earsActivity = describeEars({ state: ears.state });

  const eyes = useCompanionEyes();
  const camera = useCompanionCamera();
  const isWatching = camera.state === "on" && eyes.state.status === "awake";

  /** 目（LFM3-VL）で 1 枚見て、様子か、質問への答えを文章で返す */
  async function see({ frame, question }: { frame: string; question?: string }) {
    const output = await eyes.generate({
      messages: buildSceneMessages({ frame, question }),
      tools: [],
      thinking: false,
    });
    return splitThinking({ output }).visible;
  }

  async function lookAtCamera(question: string) {
    const frame = camera.capture();
    if (!frame) {
      throw new Error("カメラに何も映っていない");
    }
    return see({ frame, question });
  }

  // 考えている間・話している間・聞いている間は、カメラを見て話しかけない
  const activityRef = useRef(activity);
  activityRef.current = activity;
  const isListeningRef = useRef(false);
  isListeningRef.current = ears.state.status === "listening";
  useCompanionWatch({
    isEnabled: isWatching && brain.state.status === "awake",
    capture: camera.capture,
    describe: (frame) => see({ frame }),
    isIdle: () => activityRef.current === null && voice.level() === 0 && !isListeningRef.current,
    onScene: async (caption) => {
      const { userText, historyText } = buildSceneTurn({ caption });
      // 見えた様子はもう渡しているので、カメラを見直す道具は渡さない
      await respond({ userText, historyText, canLook: false });
    },
  });

  const turnRef = useRef<AbortController | null>(null);

  function describeStep({ step }: { step: CompanionStep }) {
    switch (step.type) {
      case "thinking":
        return "考え中…";
      case "tool":
        return step.description;
      case "answering":
        return "まとめてる…";
    }
  }

  /** 止めるボタン。生成中の文章を止め、道具の待ちも取りやめて、この返事をなかったことにする */
  function stopTurn() {
    turnRef.current?.abort();
    brain.interrupt();
  }

  async function talk({ text }: { text: string }) {
    const userText = text.trim();
    if (userText.length === 0 || activity) {
      return;
    }
    setDraft("");
    await respond({ userText, historyText: userText, canLook: isWatching });
  }

  /**
   * 1 回の返事を作って、表情・声・記憶に反映する。historyText は画面と記憶に残す発言、
   * canLook はカメラを見る道具を渡すか
   */
  async function respond({
    userText,
    historyText,
    canLook,
  }: {
    userText: string;
    historyText: string;
    canLook: boolean;
  }) {
    if (activityRef.current) {
      return;
    }
    activityRef.current = "考え中…";
    setError(null);
    setActivity("考え中…");
    setLog((prev) => [...prev, { role: "user", content: historyText }]);
    voice.stop();
    const turn = new AbortController();
    turnRef.current = turn;
    try {
      const reply = await runCompanionTurn({
        userText,
        historyText,
        generate: brain.generate,
        tools: [
          ...buildCompanionTools({ webSearch }),
          ...(canLook ? [createCameraTool({ look: lookAtCamera })] : []),
        ],
        context: {
          fetch: window.fetch.bind(window),
          storage: localStorage,
          now: new Date(),
          signal: turn.signal,
        },
        onStep: (step) => setActivity(describeStep({ step })),
      });
      const memory = readCompanionMemory({ storage: localStorage });
      setLog(memory.history);
      setNotes(memory.notes);
      onReply({ expression: reply.expression });
      voice.follow({ messageId: crypto.randomUUID(), text: reply.speech, isFinal: true });
      // 話している間に、溜まった古い会話を要約にしておく（次の返事の文脈を短く保つ）
      setActivity("思い出を整理してる…");
      // 要約に失敗しても会話は続けられる（古い会話が上限の 2 倍まで残るだけ）
      await compactCompanionMemory({ storage: localStorage, generate: brain.generate }).catch(
        () => false,
      );
    } catch (cause) {
      if (turn.signal.aborted) {
        setLog(readCompanionMemory({ storage: localStorage }).history);
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      turnRef.current = null;
      activityRef.current = null;
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
      {earsActivity ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {ears.state.status === "listening" ? (
            <MicIcon className="size-4 text-primary" />
          ) : (
            <Loader2Icon className="size-4 animate-spin" />
          )}
          {earsActivity}
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {ears.state.status === "error" ? (
        <p className="text-sm text-destructive">{ears.state.message}</p>
      ) : null}

      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void talk({ text: draft });
        }}
      >
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void talk({ text: draft });
            }
          }}
          placeholder="ゆーとぴあちゃんに話しかける…"
          rows={2}
          className="min-h-0 resize-none"
        />
        <Button
          type="button"
          size="icon"
          variant={ears.state.status === "listening" ? "default" : "outline"}
          aria-pressed={ears.state.status === "listening"}
          disabled={
            Boolean(activity) ||
            ears.state.status === "loading" ||
            ears.state.status === "transcribing"
          }
          onClick={() => void ears.toggle()}
        >
          <MicIcon />
          <span className="sr-only">声で話しかける</span>
        </Button>
        {activity ? (
          <Button type="button" size="icon" variant="outline" onClick={stopTurn}>
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

      <CompanionCameraControl
        camera={camera}
        eyesState={eyes.state}
        onStart={async () => {
          // 目（約 1.9 GB）は、カメラが映り始めてから読み込む（許可されなければ取得しない）
          if (await camera.start()) {
            void eyes.wake();
          }
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <VoiceToggle
          state={voice.state}
          onTurnOn={() => void voice.turnOn()}
          onTurnOff={voice.turnOff}
        />
        <WebSearchSettingsForm
          settings={webSearch}
          onSave={(settings) => {
            writeWebSearchSettings({ storage: localStorage, settings });
            setWebSearch(readWebSearchSettings({ storage: localStorage }));
          }}
          onClear={() => {
            clearWebSearchSettings({ storage: localStorage });
            setWebSearch(null);
          }}
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
        {eyes.state.status !== "asleep" ? <ModelAttribution model={EYES_MODEL} /> : null}
        {voice.state.status !== "off" ? <VoiceAttribution /> : null}
        <p className="text-xs text-muted-foreground">
          調べものをするときだけ、検索する言葉や URL を Wikipedia・Jina
          Reader（ネット検索を設定したときは
          Tavily・Exa）に送ります。カメラの映像は端末の外に出しません。
        </p>
      </div>
    </div>
  );
}

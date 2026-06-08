"use client";

import { Loader2Icon, SendIcon, SquareIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  LfmChatMessage,
  LfmChatPhase,
  LfmDownloadProgress,
  LfmWorkerEvent,
} from "@/features/local-llm/lfm-inference-worker/lfm-worker-messages";
import {
  LFM_JP_CHAT_EXAMPLES,
  LFM_JP_MODEL_LABEL,
} from "@/features/local-llm/lfm-model-config/lfm-model-config";
import { ModelDownloadProgress } from "@/features/local-llm/local-llm-chat-view/model-download-progress";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { cn } from "@/lib/cn";

const IS_WEBGPU_AVAILABLE = typeof navigator !== "undefined" && "gpu" in navigator;
const STICKY_SCROLL_THRESHOLD = 120;

export function LocalLlmChatView() {
  const workerRef = useRef<Worker | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<LfmChatPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<LfmDownloadProgress[]>([]);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<LfmChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  function submitMessage({ message }: { message: string }) {
    const trimmed = message.trim();
    if (!trimmed || isGenerating || phase !== "ready") {
      return;
    }

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setTps(null);
    setIsGenerating(true);
    setInput("");
  }

  function interruptGeneration() {
    workerRef.current?.postMessage({ type: "interrupt" });
  }

  function resetConversation() {
    workerRef.current?.postMessage({ type: "reset" });
    setMessages([]);
    setTps(null);
    setNumTokens(null);
  }

  function loadModel() {
    workerRef.current?.postMessage({ type: "load" });
    setPhase("loading");
    setError(null);
  }

  function resizeTextarea() {
    if (!textareaRef.current) {
      return;
    }

    const target = textareaRef.current;
    target.style.height = "auto";
    const newHeight = Math.min(Math.max(target.scrollHeight, 24), 200);
    target.style.height = `${newHeight}px`;
  }

  useEffect(() => {
    if (!IS_WEBGPU_AVAILABLE) {
      return;
    }

    workerRef.current = new Worker(
      new URL("../lfm-inference-worker/lfm-inference-worker.ts", import.meta.url),
      { type: "module" },
    );
    workerRef.current.postMessage({ type: "check" });

    const onMessageReceived = (event: MessageEvent<LfmWorkerEvent>) => {
      const payload = event.data;

      if (payload.status === "loading") {
        setPhase("loading");
        setLoadingMessage(payload.data);
        return;
      }

      if (payload.status === "initiate") {
        setProgressItems((prev) => [...prev, payload]);
        return;
      }

      if (payload.status === "progress") {
        setProgressItems((prev) =>
          prev.map((item) => (item.file === payload.file ? { ...item, ...payload } : item)),
        );
        return;
      }

      if (payload.status === "done") {
        setProgressItems((prev) => prev.filter((item) => item.file !== payload.file));
        return;
      }

      if (payload.status === "ready") {
        setPhase("ready");
        return;
      }

      if (payload.status === "start") {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: "" },
        ]);
        return;
      }

      if (payload.status === "update") {
        setTps(payload.tps);
        setNumTokens(payload.numTokens);
        setMessages((prev) => {
          const cloned = [...prev];
          const last = cloned.at(-1);
          if (last?.role !== "assistant") {
            return prev;
          }
          cloned[cloned.length - 1] = {
            ...last,
            content: last.content + payload.output,
          };
          return cloned;
        });
        return;
      }

      if (payload.status === "complete") {
        setIsGenerating(false);
        setPhase("ready");
        return;
      }

      if (payload.status === "error") {
        setError(payload.data);
        setPhase("idle");
        setIsGenerating(false);
      }
    };

    const onErrorReceived = (event: ErrorEvent) => {
      setError(event.message);
      setPhase("idle");
      setIsGenerating(false);
    };

    const worker = workerRef.current;
    worker.addEventListener("message", onMessageReceived);
    worker.addEventListener("error", onErrorReceived);

    return () => {
      worker.removeEventListener("message", onMessageReceived);
      worker.removeEventListener("error", onErrorReceived);
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (messages.filter((message) => message.role === "user").length === 0) {
      return;
    }

    if (messages.at(-1)?.role === "assistant") {
      return;
    }

    setTps(null);
    workerRef.current?.postMessage({
      type: "generate",
      data: messages.map(({ role, content }) => ({ role, content })),
    });
  }, [messages]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when message content grows during streaming
  useEffect(() => {
    if (!chatContainerRef.current || !isGenerating) {
      return;
    }

    const element = chatContainerRef.current;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < STICKY_SCROLL_THRESHOLD) {
      element.scrollTop = element.scrollHeight;
    }
  }, [messages, isGenerating]);

  if (!IS_WEBGPU_AVAILABLE) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Lab"
          title="ローカル LLM チャット"
          description="WebGPU が利用できないため、このブラウザでは実行できません。Chrome、Edge、Safari 26+ などをお試しください。"
        />
        <Button render={<Link href="/lab" />} variant="outline" nativeButton={false}>
          Lab に戻る
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Lab"
        title="ローカル LLM チャット"
        description="LiquidAI LFM2.5-1.2B-JP をブラウザ内で動かす実験です。推論は端末上で完結し、サーバーには送信されません。"
      />

      {phase === "idle" && messages.length === 0 ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">モデルを読み込む</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{LFM_JP_MODEL_LABEL}</span>
              （約 1.2B パラメータ・日本語特化）をダウンロードして、WebGPU
              で推論します。初回のみ数百 MB 程度の取得が発生しますが、2
              回目以降はブラウザキャッシュから読み込まれます。
            </p>
            <p>
              Transformers.js と ONNX Runtime Web
              を使っています。モデル取得後はオフラインでも会話できます。
            </p>
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </p>
            ) : null}
            <Button onClick={loadModel} disabled={error !== null}>
              モデルを読み込む
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {phase === "loading" ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Loader2Icon className="size-4 animate-spin" />
              読み込み中
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
            <ModelDownloadProgress items={progressItems} />
          </CardContent>
        </Card>
      ) : null}

      {phase === "ready" || phase === "generating" ? (
        <div className="flex min-h-[32rem] flex-col gap-4">
          <div
            ref={chatContainerRef}
            className="flex-1 space-y-4 overflow-y-auto rounded-xl border border-border/70 bg-card/50 p-4 sm:p-6"
          >
            {messages.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">例文をクリックして試せます。</p>
                <ul className="flex flex-col gap-2">
                  {LFM_JP_CHAT_EXAMPLES.map((example) => (
                    <li key={example}>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                        onClick={() => submitMessage({ message: example })}
                        disabled={isGenerating}
                      >
                        {example}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "max-w-[90%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground",
                  )}
                >
                  {message.content ||
                    (isGenerating && message.id === messages.at(-1)?.id ? "…" : "")}
                </div>
              ))
            )}
          </div>

          {tps !== null && numTokens !== null && messages.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {isGenerating ? (
                <>
                  生成中 — <span className="tabular-nums">{tps.toFixed(1)}</span> tokens/秒
                </>
              ) : (
                <>
                  <span className="tabular-nums">{numTokens}</span> トークンを{" "}
                  <span className="tabular-nums">{(numTokens / tps).toFixed(1)}</span> 秒で生成（
                  <span className="tabular-nums">{tps.toFixed(1)}</span> tokens/秒）
                  {" · "}
                  <button
                    type="button"
                    className="underline underline-offset-2 hover:text-foreground"
                    onClick={resetConversation}
                  >
                    会話をリセット
                  </button>
                </>
              )}
            </p>
          ) : null}

          <div className="flex items-end gap-2 rounded-xl border border-border/70 bg-card/70 p-3">
            <Textarea
              ref={textareaRef}
              value={input}
              rows={1}
              placeholder="メッセージを入力…"
              className="min-h-6 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
              disabled={isGenerating}
              onChange={(event) => {
                setInput(event.target.value);
                resizeTextarea();
              }}
              onKeyDown={(event) => {
                if (input.length > 0 && !isGenerating && event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submitMessage({ message: input });
                }
              }}
            />
            {isGenerating ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="生成を停止"
                onClick={interruptGeneration}
              >
                <SquareIcon className="size-4" />
              </Button>
            ) : (
              <Button
                type="button"
                size="icon"
                aria-label="送信"
                disabled={input.trim().length === 0}
                onClick={() => submitMessage({ message: input })}
              >
                <SendIcon className="size-4" />
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">免責: 生成内容は不正確な場合があります。</p>
        </div>
      ) : null}

      <Button render={<Link href="/lab" />} variant="outline" nativeButton={false}>
        Lab に戻る
      </Button>
    </div>
  );
}

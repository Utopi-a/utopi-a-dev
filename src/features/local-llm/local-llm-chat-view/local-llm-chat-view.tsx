"use client";

import { Loader2Icon } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BrowserInferenceClient } from "@/features/local-llm/browser-inference-client/browser-inference-client";
import type {
  DownloadProgress,
  InferenceWorkerEvent,
  LocalLlmChatPhase,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import { ChatComposer } from "@/features/local-llm/local-llm-chat-view/chat-composer";
import { ChatMessageList } from "@/features/local-llm/local-llm-chat-view/chat-message-list";
import type { ChatMessage } from "@/features/local-llm/local-llm-chat-view/chat-message-types";
import { ModelAttribution } from "@/features/local-llm/local-llm-chat-view/model-attribution";
import { ModelDownloadProgress } from "@/features/local-llm/local-llm-chat-view/model-download-progress";
import { ModelSelector } from "@/features/local-llm/local-llm-chat-view/model-selector";
import {
  DEFAULT_LOCAL_LLM_MODEL_ID,
  getLocalLlmModelById,
  modelSupportsImages,
} from "@/features/local-llm/model-registry/local-llm-models";
import { PageHeader } from "@/features/portfolio/page-header/page-header";

const STICKY_SCROLL_THRESHOLD = 120;
const SELECTED_MODEL_STORAGE_KEY = "local-llm:selected-model";
type WebGpuAvailability = "checking" | "available" | "unavailable";

function readStoredModelId() {
  if (typeof window === "undefined") {
    return DEFAULT_LOCAL_LLM_MODEL_ID;
  }

  return window.sessionStorage.getItem(SELECTED_MODEL_STORAGE_KEY) ?? DEFAULT_LOCAL_LLM_MODEL_ID;
}

export function LocalLlmChatView() {
  const inferenceClientRef = useRef<BrowserInferenceClient | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [selectedModelId, setSelectedModelId] = useState(DEFAULT_LOCAL_LLM_MODEL_ID);
  const [loadedModelId, setLoadedModelId] = useState<string | null>(null);
  const [phase, setPhase] = useState<LocalLlmChatPhase>("idle");
  const [webGpuAvailability, setWebGpuAvailability] = useState<WebGpuAvailability>("checking");
  const [isInferenceClientReady, setIsInferenceClientReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [progressItems, setProgressItems] = useState<DownloadProgress[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tps, setTps] = useState<number | null>(null);
  const [numTokens, setNumTokens] = useState<number | null>(null);

  const selectedModel =
    getLocalLlmModelById({ modelId: selectedModelId }) ??
    getLocalLlmModelById({ modelId: DEFAULT_LOCAL_LLM_MODEL_ID });
  const activeModel =
    getLocalLlmModelById({ modelId: loadedModelId ?? selectedModelId }) ?? selectedModel;

  const terminateInferenceClient = useCallback(() => {
    inferenceClientRef.current?.terminate();
    inferenceClientRef.current = null;
    setIsInferenceClientReady(false);
  }, []);

  useEffect(() => {
    setSelectedModelId(readStoredModelId());
  }, []);

  useEffect(() => {
    setWebGpuAvailability("gpu" in navigator ? "available" : "unavailable");
  }, []);

  useEffect(() => {
    if (webGpuAvailability !== "available" || !getLocalLlmModelById({ modelId: selectedModelId })) {
      return;
    }

    let isActive = true;

    const onMessageReceived = (event: MessageEvent<InferenceWorkerEvent>) => {
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
        setLoadedModelId(payload.modelId);
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
        setLoadedModelId(null);
      }
    };

    const onErrorReceived = (event: ErrorEvent) => {
      setError(event.message);
      setPhase("idle");
      setIsGenerating(false);
      setLoadedModelId(null);
    };

    terminateInferenceClient();

    void import("@/features/local-llm/browser-inference-client/browser-inference-client")
      .then(({ createBrowserInferenceClient }) => {
        if (!isActive) {
          return;
        }

        const client = createBrowserInferenceClient({
          onError: onErrorReceived,
          onMessage: onMessageReceived,
        });
        inferenceClientRef.current = client;
        setIsInferenceClientReady(true);
        client.postMessage({ type: "check" });
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        onErrorReceived(
          new ErrorEvent("error", {
            message: error instanceof Error ? error.message : String(error),
          }),
        );
      });

    return () => {
      isActive = false;
      terminateInferenceClient();
    };
  }, [selectedModelId, terminateInferenceClient, webGpuAvailability]);

  useEffect(() => {
    if (messages.filter((message) => message.role === "user").length === 0) {
      return;
    }

    if (messages.at(-1)?.role === "assistant") {
      return;
    }

    setTps(null);
    inferenceClientRef.current?.postMessage({
      type: "generate",
      data: messages.map(({ role, content, images }) => ({
        role,
        content,
        images: images?.map(({ dataUrl, name, mimeType }) => ({ dataUrl, name, mimeType })),
      })),
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

  function handleSelectModel({ modelId }: { modelId: string }) {
    setSelectedModelId(modelId);
    window.sessionStorage.setItem(SELECTED_MODEL_STORAGE_KEY, modelId);
    setError(null);
    setMessages([]);
    setTps(null);
    setNumTokens(null);
    setLoadedModelId(null);
    setPhase("idle");
  }

  function loadModel() {
    if (!selectedModel) {
      return;
    }

    setError(null);
    setPhase("loading");
    setProgressItems([]);
    inferenceClientRef.current?.postMessage({
      type: "load",
      model: {
        huggingFaceModelId: selectedModel.huggingFaceModelId,
        kind: selectedModel.kind,
        dtype: selectedModel.dtype,
      },
    });
  }

  function submitMessage({ message, images }: { message: string; images: ChatMessage["images"] }) {
    if (!selectedModel || isGenerating || phase !== "ready") {
      return;
    }

    const trimmed = message.trim();
    const hasImages = (images?.length ?? 0) > 0;
    if (!trimmed && !hasImages) {
      return;
    }

    if (modelSupportsImages({ model: selectedModel })) {
      const hasPreviousImage = messages.some((entry) => (entry.images?.length ?? 0) > 0);
      if (!hasImages && !hasPreviousImage) {
        setError("このモデルでは最初のメッセージに画像の添付が必要です。");
        return;
      }
    } else if (hasImages) {
      setError("選択中のモデルは画像入力に対応していません。");
      return;
    }

    setError(null);
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmed || "この画像について教えてください。",
        images,
      },
    ]);
    setTps(null);
    setIsGenerating(true);
  }

  function resetConversation() {
    inferenceClientRef.current?.postMessage({ type: "reset" });
    setMessages([]);
    setTps(null);
    setNumTokens(null);
    setError(null);
  }

  function changeModel() {
    resetConversation();
    setLoadedModelId(null);
    setPhase("idle");
    setProgressItems([]);
  }

  if (webGpuAvailability === "checking") {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Lab"
          title="ローカル LLM チャット"
          description="WebGPU の利用可否を確認しています。"
        />
        <Button render={<Link href="/lab" />} variant="outline" nativeButton={false}>
          Lab に戻る
        </Button>
      </div>
    );
  }

  if (webGpuAvailability === "unavailable") {
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

  if (!selectedModel || !activeModel) {
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Lab"
        title="ローカル LLM チャット"
        description="WebGPU + Transformers.js で端末内推論する実験です。会話内容はサーバーに送信されません。"
      />

      {phase === "idle" && messages.length === 0 ? (
        <Card className="border-border/70 bg-card/70">
          <CardHeader>
            <CardTitle className="text-base">モデルを読み込む</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <ModelSelector selectedModelId={selectedModelId} onSelectModel={handleSelectModel} />
            <p>{selectedModel.description}</p>
            <p>
              初回のみ{" "}
              <span className="font-medium text-foreground">{selectedModel.estimatedDownload}</span>
              程度のダウンロードが発生します。2 回目以降はブラウザキャッシュから読み込まれます。
            </p>
            <ModelAttribution model={selectedModel} />
            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-destructive">
                {error}
              </p>
            ) : null}
            <Button onClick={loadModel} disabled={!isInferenceClientReady}>
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
              {selectedModel.label} を読み込み中
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              使用中: <span className="font-medium text-foreground">{activeModel.label}</span>
            </p>
            <Button type="button" variant="outline" size="sm" onClick={changeModel}>
              モデルを変更
            </Button>
          </div>

          {messages.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-card/50 p-4 sm:p-6">
              <p className="mb-3 text-sm text-muted-foreground">例文をクリックして試せます。</p>
              <ul className="flex flex-col gap-2">
                {activeModel.examples.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                      onClick={() =>
                        submitMessage({
                          message: example,
                          images: undefined,
                        })
                      }
                      disabled={isGenerating || modelSupportsImages({ model: activeModel })}
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
              {modelSupportsImages({ model: activeModel }) ? (
                <p className="mt-3 text-xs text-muted-foreground">
                  画像入力モデルは、画像を添付して質問してください。
                </p>
              ) : null}
            </div>
          ) : (
            <ChatMessageList
              messages={messages}
              isGenerating={isGenerating}
              containerRef={chatContainerRef}
            />
          )}

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

          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <ChatComposer
            disabled={phase !== "ready"}
            isGenerating={isGenerating}
            supportsImages={modelSupportsImages({ model: activeModel })}
            onSubmit={submitMessage}
            onInterrupt={() => inferenceClientRef.current?.postMessage({ type: "interrupt" })}
          />

          <ModelAttribution model={activeModel} />
          <p className="text-xs text-muted-foreground">免責: 生成内容は不正確な場合があります。</p>
        </div>
      ) : null}

      <Button render={<Link href="/lab" />} variant="outline" nativeButton={false}>
        Lab に戻る
      </Button>
    </div>
  );
}

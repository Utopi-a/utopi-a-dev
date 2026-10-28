"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrowserInferenceClient } from "@/features/local-llm/browser-inference-client/browser-inference-client";
import type { InferenceWorkerEvent } from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  getLocalLlmModelById,
  type TransformersLocalLlmModel,
} from "@/features/local-llm/model-registry/local-llm-models";
import type { CompanionGenerate } from "@/features/utopia-companion/companion-agent";

/**
 * ゆーとぴあちゃんの頭は LFM3-1.7B。LFM3-VL-2B は同じ指示でも道具を呼ばずに答えてしまうことが多く、
 * 道具を使う会話にはテキストのモデルのほうが向いている
 */
export const COMPANION_MODEL = getLocalLlmModelById({
  modelId: "lfm3-1.7b",
}) as TransformersLocalLlmModel;

export type CompanionBrainState =
  | { status: "asleep" }
  | { status: "waking"; loaded: number; total: number; message: string }
  | { status: "awake" }
  | { status: "error"; message: string };

type PendingGeneration = {
  output: string;
  resolve: (output: string) => void;
  reject: (error: Error) => void;
};

/**
 * ゆーとぴあちゃんの頭（LFM3-1.7B）を端末内で動かす。読み込みは起こしたときにだけ行い、
 * 生成は 1 回ずつ文章を丸ごと返す（エージェントがツールの呼び出しを読み取ってから次へ進むため）。
 */
export function useCompanionBrain() {
  const clientRef = useRef<BrowserInferenceClient | null>(null);
  const pendingRef = useRef<PendingGeneration | null>(null);
  const [state, setState] = useState<CompanionBrainState>({ status: "asleep" });

  const fail = useCallback((message: string) => {
    pendingRef.current?.reject(new Error(message));
    pendingRef.current = null;
  }, []);

  const wake = useCallback(async () => {
    if (clientRef.current) {
      return;
    }
    if (!("gpu" in navigator)) {
      setState({ status: "error", message: "このブラウザは WebGPU に対応していません" });
      return;
    }
    setState({ status: "waking", loaded: 0, total: 0, message: "頭を読み込んでいます…" });
    const files = new Map<string, { loaded: number; total: number }>();

    const onMessage = ({ data }: MessageEvent<InferenceWorkerEvent>) => {
      switch (data.status) {
        case "loading":
          setState((prev) => (prev.status === "waking" ? { ...prev, message: data.data } : prev));
          return;
        case "initiate":
        case "progress": {
          files.set(data.file, { loaded: data.loaded ?? 0, total: data.total ?? 0 });
          const values = [...files.values()];
          setState((prev) =>
            prev.status === "waking"
              ? {
                  ...prev,
                  loaded: values.reduce((sum, file) => sum + file.loaded, 0),
                  total: values.reduce((sum, file) => sum + file.total, 0),
                }
              : prev,
          );
          return;
        }
        case "ready":
          setState({ status: "awake" });
          return;
        case "update":
          if (pendingRef.current) {
            pendingRef.current.output += data.output;
          }
          return;
        case "complete":
          pendingRef.current?.resolve(pendingRef.current.output);
          pendingRef.current = null;
          return;
        case "generation-error":
          fail(data.data);
          return;
        case "error":
          fail(data.data);
          setState((prev) =>
            prev.status === "awake" ? prev : { status: "error", message: data.data },
          );
          return;
      }
    };

    const { createBrowserInferenceClient } = await import(
      "@/features/local-llm/browser-inference-client/browser-inference-client"
    );
    const client = createBrowserInferenceClient({
      onMessage,
      onError: (event) => {
        fail(event.message);
        setState({ status: "error", message: event.message });
      },
    });
    clientRef.current = client;
    client.postMessage({ type: "check" });
    client.postMessage({
      type: "load",
      model: {
        huggingFaceModelId: COMPANION_MODEL.huggingFaceModelId,
        kind: COMPANION_MODEL.kind,
        dtype: COMPANION_MODEL.dtype,
      },
    });
  }, [fail]);

  const generate = useCallback<CompanionGenerate>(
    ({ messages, tools, thinking }) =>
      new Promise((resolve, reject) => {
        const client = clientRef.current;
        if (!client) {
          reject(new Error("ゆーとぴあちゃんはまだ起きていません"));
          return;
        }
        pendingRef.current = { output: "", resolve, reject };
        // テキストのパイプラインは前の生成の KV キャッシュを続きとして使う。エージェントは毎回プロンプトを
        // 組み直す（記憶・道具の結果が変わる）ので、続きとして扱われないよう捨ててから生成する
        client.postMessage({ type: "reset" });
        client.postMessage({ type: "generate", data: messages, tools, generation: { thinking } });
      }),
    [],
  );

  const interrupt = useCallback(() => {
    clientRef.current?.postMessage({ type: "interrupt" });
  }, []);

  useEffect(
    () => () => {
      clientRef.current?.terminate();
      clientRef.current = null;
    },
    [],
  );

  return { state, wake, generate, interrupt };
}

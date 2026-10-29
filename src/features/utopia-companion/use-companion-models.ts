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

/**
 * カメラを一緒に見ている間は、LFM3-VL-2B が映像を見ながら話す。
 * 映像を文章にしてから LFM3-1.7B に渡すと、見えていたものが落ちて「見えない」と答えた。
 * カメラを使い始めたときにだけ読み込む
 */
export const VISION_MODEL = getLocalLlmModelById({
  modelId: "lfm3-vl-2b",
}) as TransformersLocalLlmModel;

type CreateClient = (options: {
  onError: (event: ErrorEvent) => void;
  onMessage: (event: MessageEvent<InferenceWorkerEvent>) => void;
}) => BrowserInferenceClient;

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
 * ゆーとぴあちゃんのモデルを端末内で動かす。読み込みは起こしたときにだけ行い、
 * 生成は 1 回ずつ文章を丸ごと返す（エージェントがツールの呼び出しを読み取ってから次へ進むため）。
 */
function useCompanionModel({
  model,
  loadClient,
}: {
  model: TransformersLocalLlmModel;
  loadClient: () => Promise<CreateClient>;
}) {
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
    setState({ status: "waking", loaded: 0, total: 0, message: "読み込んでいます…" });
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

    const createClient = await loadClient();
    const client = createClient({
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
        huggingFaceModelId: model.huggingFaceModelId,
        kind: model.kind,
        dtype: model.dtype,
      },
    });
  }, [fail, model, loadClient]);

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

const loadInProcessClient = () =>
  import("@/features/local-llm/browser-inference-client/browser-inference-client").then(
    ({ createBrowserInferenceClient }) => createBrowserInferenceClient,
  );
const loadWorkerClient = () =>
  import("@/features/local-llm/browser-inference-client/worker-inference-client").then(
    ({ createWorkerInferenceClient }) => createWorkerInferenceClient,
  );

/** ゆーとぴあちゃんの頭（LFM3-1.7B）。ページの中で動かす */
export function useCompanionBrain() {
  return useCompanionModel({ model: COMPANION_MODEL, loadClient: loadInProcessClient });
}

/**
 * カメラを見ながら話す頭（LFM3-VL-2B）。LFM3-1.7B と同時に読み込んでおくので、別の Worker で動かす
 * （パイプラインはモジュールごとに 1 つで、同じ場所で読み込むと LFM3-1.7B を外してしまう）
 */
export function useCompanionVision() {
  return useCompanionModel({ model: VISION_MODEL, loadClient: loadWorkerClient });
}

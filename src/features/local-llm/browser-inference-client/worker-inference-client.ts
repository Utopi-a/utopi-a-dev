import type { BrowserInferenceClient } from "@/features/local-llm/browser-inference-client/browser-inference-client";
import type { InferenceWorkerEvent } from "@/features/local-llm/inference-worker/inference-worker-messages";

/**
 * 推論を専用の Worker で動かすクライアント。パイプラインはモジュールごとに 1 つずつしか持てないので、
 * 同じページでモデルを 2 つ同時に動かす（テキストの頭と、画像を見る目など）ときは、片方をこちらで動かす
 */
export function createWorkerInferenceClient({
  onError,
  onMessage,
}: {
  onError: (event: ErrorEvent) => void;
  onMessage: (event: MessageEvent<InferenceWorkerEvent>) => void;
}): BrowserInferenceClient {
  const worker = new Worker(new URL("../inference-worker/inference-worker.ts", import.meta.url), {
    type: "module",
    name: "inference",
  });
  worker.onmessage = onMessage;
  worker.onerror = onError;
  return {
    postMessage: (command) => worker.postMessage(command),
    terminate: () => worker.terminate(),
  };
}

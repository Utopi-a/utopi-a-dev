import type { BrowserInferenceClient } from "@/features/local-llm/browser-inference-client/browser-inference-client";
import type {
  InferenceImageAttachment,
  InferenceMessage,
  InferenceWorkerEvent,
  LocalLlmReplyMode,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  nextReplyDelta,
  systemTextFor,
} from "@/features/local-llm/omni-engine-client/omni-reply-text";

// fusor-ai の lfm3-runtime を動かす静的 Worker（public/lfm3-omni/engine-worker.js）。
// バンドラを通すとランタイムの動的 import が書き換わるので、public から配信してそのまま読む。
const ENGINE_WORKER_URL = "/lfm3-omni/engine-worker.js";
const BUNDLE_LABEL = "LFM3-Omni-2B（fusor 7bit バンドル）";

type ReplyProgress = {
  answer: string;
  tokens: number;
};

type EngineMessage =
  | { type: "progress"; done: number; total: number }
  | { type: "ready" }
  | { type: "warning"; message: string }
  | { type: "started"; job: number }
  | ({ type: "reply"; job: number } & ReplyProgress)
  | ({ type: "done"; job: number; stopped: boolean } & Partial<ReplyProgress>)
  | { type: "error" | "fatal"; job?: number; message: string };

type OmniEngineClientOptions = {
  onError: (event: ErrorEvent) => void;
  onMessage: (event: MessageEvent<InferenceWorkerEvent>) => void;
};

/** 画像をランタイムが受け取る RGBA（色変換なし）にする */
async function decodeImage({ image }: { image: InferenceImageAttachment }) {
  const blob = await (await fetch(image.dataUrl)).blob();
  const bitmap = await createImageBitmap(blob, {
    colorSpaceConversion: "none",
    premultiplyAlpha: "none",
  });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("画像を読み込めませんでした");
  }
  const { width, height } = bitmap;
  context.drawImage(bitmap, 0, 0);
  const { data } = context.getImageData(0, 0, width, height);
  bitmap.close();
  return { width, height, rgba: data };
}

function concatBytes({ chunks }: { chunks: Uint8ClampedArray[] }) {
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function concatSamples({ chunks }: { chunks: Float32Array[] }) {
  const out = new Float32Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/**
 * LFM3-Omni-2B のエンジン Worker を、Transformers.js 用クライアントと同じコマンド・イベントで扱う。
 * エンジンは会話の履歴（画像・音声を含む）を自分で持つので、generate では最後のユーザー発言だけを送る。
 */
export function createOmniEngineClient({
  onError,
  onMessage,
}: OmniEngineClientOptions): BrowserInferenceClient {
  let worker = startWorker();
  let isTerminated = false;
  let isLoaded = false;
  let jobs = 0;
  let currentJob: { id: number; answer: string; firstTokenAt: number | null } | null = null;

  const emit = (event: InferenceWorkerEvent) => {
    if (!isTerminated) {
      onMessage(new MessageEvent("message", { data: event }));
    }
  };

  function emitReply({ answer: rawAnswer, tokens }: ReplyProgress) {
    if (!currentJob) {
      return;
    }
    const now = performance.now();
    if (tokens > 0) {
      currentJob.firstTokenAt ??= now;
    }
    const elapsed = currentJob.firstTokenAt === null ? 0 : now - currentJob.firstTokenAt;
    const tps = tokens > 1 && elapsed > 0 ? ((tokens - 1) / elapsed) * 1000 : null;
    const next = nextReplyDelta({ previous: currentJob.answer, current: rawAnswer });
    if (!next) {
      return;
    }
    currentJob.answer = next.settled;
    const output = next.delta;
    emit({ status: "update", output, tps, numTokens: tokens });
  }

  function startWorker() {
    const engineWorker = new Worker(ENGINE_WORKER_URL, {
      type: "module",
      name: "lfm3-omni-engine",
    });
    engineWorker.onmessage = handleEngineMessage;
    engineWorker.onerror = (event) => {
      if (!isTerminated) {
        onError(new ErrorEvent("error", { message: event.message || "エンジンが停止しました" }));
      }
    };
    return engineWorker;
  }

  function handleEngineMessage({ data }: MessageEvent<EngineMessage>) {
    switch (data.type) {
      case "progress":
        emit({ status: "progress", file: BUNDLE_LABEL, progress: data.done, total: data.total });
        return;
      case "ready":
        isLoaded = true;
        emit({ status: "done", file: BUNDLE_LABEL });
        emit({ status: "ready", modelId: "lfm3-omni-2b" });
        return;
      case "warning":
        console.warn(data.message);
        return;
      case "started":
        if (data.job === currentJob?.id) {
          emit({ status: "start" });
        }
        return;
      case "reply":
        if (data.job === currentJob?.id) {
          emitReply(data);
        }
        return;
      case "done":
        if (data.job !== currentJob?.id) {
          return;
        }
        if (!data.stopped && data.answer !== undefined && data.tokens !== undefined) {
          emitReply({ answer: data.answer, tokens: data.tokens });
        }
        currentJob = null;
        emit({ status: "complete" });
        return;
      case "error":
      case "fatal":
        currentJob = null;
        if (data.type === "error" && isLoaded) {
          emit({ status: "generation-error", data: data.message });
          return;
        }
        // 致命的なエラーのあとは WASM の状態が失われているので、Worker を作り直して読み込みからやり直してもらう
        isLoaded = false;
        worker.terminate();
        worker = startWorker();
        emit({ status: "error", data: data.message });
        return;
    }
  }

  async function generate({
    messages,
    replyMode,
  }: {
    messages: InferenceMessage[];
    replyMode: LocalLlmReplyMode;
  }) {
    const message = messages.findLast((entry) => entry.role === "user");
    if (!message) {
      return;
    }
    const images = await Promise.all((message.images ?? []).map((image) => decodeImage({ image })));
    const clips = message.audio ?? [];
    const rgba = concatBytes({ chunks: images.map((image) => image.rgba) });
    const audio = concatSamples({ chunks: clips.map((clip) => clip.samples) });
    const layout = JSON.stringify({
      images: images.map(({ width, height }) => [width, height]),
      clips: clips.map((clip) => clip.samples.length),
    });
    const [seed] = crypto.getRandomValues(new Uint32Array(1));
    const engineMessage = JSON.stringify({
      text: message.content,
      system: systemTextFor({ replyMode }),
      mode: replyMode.mode,
      thinking: false,
      seed,
    });

    currentJob = { id: ++jobs, answer: "", firstTokenAt: null };
    worker.postMessage(
      { type: "send", job: currentJob.id, message: engineMessage, rgba, audio, layout },
      [rgba.buffer, audio.buffer],
    );
  }

  return {
    postMessage(command) {
      if (isTerminated) {
        return;
      }
      switch (command.type) {
        case "check":
          return;
        case "load":
          emit({ status: "loading", data: "重みを取得して WASM ランタイムに読み込んでいます…" });
          emit({ status: "initiate", file: BUNDLE_LABEL, progress: 0, total: 0 });
          worker.postMessage({ type: "load" });
          return;
        case "generate":
          void generate({
            messages: command.data,
            replyMode: command.replyMode ?? { mode: "text" },
          }).catch((error: unknown) => {
            currentJob = null;
            emit({
              status: "generation-error",
              data: error instanceof Error ? error.message : String(error),
            });
          });
          return;
        case "interrupt":
          if (currentJob) {
            worker.postMessage({ type: "stop", job: currentJob.id });
          }
          return;
        case "reset":
          worker.postMessage({ type: "reset" });
          return;
      }
    },
    terminate() {
      isTerminated = true;
      worker.terminate();
    },
  };
}

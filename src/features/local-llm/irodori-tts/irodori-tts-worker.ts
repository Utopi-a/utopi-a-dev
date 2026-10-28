import { PreTrainedTokenizer } from "@huggingface/transformers";
import { InferenceSession, Tensor } from "onnxruntime-web/webgpu";
import {
  evictStaleIrodoriCaches,
  loadIrodoriFiles,
} from "@/features/local-llm/irodori-tts/irodori-model-files";
import {
  createIrodoriSynthesizer,
  createRandomNormal,
  type IrodoriSpeakerCondition,
} from "@/features/local-llm/irodori-tts/irodori-synthesizer";
import type { IrodoriVoice } from "@/features/local-llm/irodori-tts/utopia-voice";

// Irodori-TTS を専用の Worker で動かす。チャットのモデル（Transformers.js）と同じ ONNX Runtime の WebGPU を
// 同時に使うと、実行が混ざって壊れるため、Worker ごとに別の GPU デバイスを持たせる。

// 手本なしで合成すると、キャプションに合う声を毎回初期ノイズから選び直すので、文ごとに別人の声になる。
// 用意した手本の声の潜在を読み込み、すべての文をその声に寄せる。

export type IrodoriWorkerCommand =
  | ({ type: "load" } & IrodoriVoice)
  | { type: "synthesize"; id: number; text: string };

export type IrodoriWorkerEvent =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; sampleRate: number }
  | { type: "synthesized"; id: number; samples: Float32Array<ArrayBuffer> }
  | { type: "error"; id?: number; message: string };

const post = (event: IrodoriWorkerEvent, transfer: Transferable[] = []) =>
  self.postMessage(event, { transfer });

function decodeJson<T>({ bytes }: { bytes: Uint8Array }) {
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}

async function createSession({
  model,
  dataPath,
  data,
}: {
  model: Uint8Array;
  dataPath: string;
  data: Uint8Array;
}) {
  // 重みは外部データで渡す。WebGPU では wasm のメモリを通らず GPU に載る
  return InferenceSession.create(model, {
    executionProviders: ["webgpu"],
    externalData: [{ path: dataPath, data }],
  });
}

async function loadReferenceLatent({ path }: { path: string }) {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`手本の声を取得できませんでした（HTTP ${response.status}）`);
  }
  return new Float32Array(await response.arrayBuffer());
}

async function load({ caption, referenceLatentPath }: IrodoriVoice) {
  const referenceLatent = loadReferenceLatent({ path: referenceLatentPath });
  void evictStaleIrodoriCaches();
  const files = await loadIrodoriFiles({
    keys: [
      "textTokenizer",
      "captionTokenizer",
      "tokenizerConfig",
      "forcedSplits",
      "annotationEmojis",
      "encoder",
      "encoderData",
      "duration",
      "durationData",
      "dit",
      "ditData",
      "decoder",
      "decoderData",
      "speaker",
      "speakerData",
    ],
    onProgress: ({ loaded, total }) => post({ type: "progress", loaded, total }),
  });
  const tokenizerConfig = decodeJson<object>({ bytes: files.tokenizerConfig });
  const synthesizer = createIrodoriSynthesizer({
    Tensor,
    sessions: {
      encoder: await createSession({
        model: files.encoder,
        dataPath: "encoder.onnx.data",
        data: files.encoderData,
      }),
      duration: await createSession({
        model: files.duration,
        dataPath: "duration.onnx.data",
        data: files.durationData,
      }),
      dit: await createSession({
        model: files.dit,
        dataPath: "dit.onnx.data",
        data: files.ditData,
      }),
      decoder: await createSession({
        model: files.decoder,
        dataPath: "decoder.onnx.data",
        data: files.decoderData,
      }),
      speaker: await createSession({
        model: files.speaker,
        dataPath: "speaker.onnx.data",
        data: files.speakerData,
      }),
    },
    textTokenizer: new PreTrainedTokenizer(
      decodeJson<object>({ bytes: files.textTokenizer }),
      tokenizerConfig,
    ),
    captionTokenizer: new PreTrainedTokenizer(
      decodeJson<object>({ bytes: files.captionTokenizer }),
      tokenizerConfig,
    ),
    forcedSplits: decodeJson<Record<string, number[]>>({ bytes: files.forcedSplits }),
    annotationEmojis: decodeJson<string[]>({ bytes: files.annotationEmojis }),
    randomNormal: createRandomNormal(),
  });
  const speaker = await synthesizer.encodeSpeaker({ latent: await referenceLatent });
  return { synthesizer, caption, speaker };
}

let voice: {
  synthesizer: ReturnType<typeof createIrodoriSynthesizer>;
  caption: string;
  speaker: IrodoriSpeakerCondition;
} | null = null;
// 合成は 1 文ずつ順に行う（WebGPU の実行を重ねない）
let queue = Promise.resolve();

self.addEventListener("message", ({ data }: MessageEvent<IrodoriWorkerCommand>) => {
  queue = queue.then(async () => {
    try {
      if (data.type === "load") {
        voice ??= await load(data);
        post({ type: "ready", sampleRate: voice.synthesizer.sampleRate });
        return;
      }
      if (!voice) {
        throw new Error("読み上げのモデルを読み込んでいません");
      }
      const { samples } = await voice.synthesizer.synthesize({
        text: data.text,
        caption: voice.caption,
        speaker: voice.speaker,
      });
      post({ type: "synthesized", id: data.id, samples }, [samples.buffer]);
    } catch (error) {
      post({
        type: "error",
        id: data.type === "synthesize" ? data.id : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
});

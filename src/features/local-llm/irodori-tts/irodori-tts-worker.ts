import { PreTrainedTokenizer } from "@huggingface/transformers";
import { InferenceSession, Tensor } from "onnxruntime-web/webgpu";
import {
  evictStaleIrodoriCaches,
  loadIrodoriFiles,
} from "@/features/local-llm/irodori-tts/irodori-model-files";
import {
  createIrodoriSynthesizer,
  createRandomNormal,
  createSeededRandom,
  type IrodoriSpeakerCondition,
} from "@/features/local-llm/irodori-tts/irodori-synthesizer";

// Irodori-TTS を専用の Worker で動かす。チャットのモデル（Transformers.js）と同じ ONNX Runtime の WebGPU を
// 同時に使うと、実行が混ざって壊れるため、Worker ごとに別の GPU デバイスを持たせる。

// 手本なしで合成すると、キャプションに合う声を毎回初期ノイズから選び直すので、文ごとに別人の声になる。
// 読み込み時に決まった種で 1 度だけ手本の声を作り、すべての文をその声に寄せる（種が同じなら毎回同じ声）
const VOICE_SAMPLE_TEXT =
  "こんにちは。今日はいい天気ですね。気になることがあれば、何でも気軽に話しかけてください。";
const VOICE_SEED = 1;

export type IrodoriWorkerCommand =
  | { type: "load"; caption: string }
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

async function load({ caption }: { caption: string }) {
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
    randomNormal: createRandomNormal({ random: createSeededRandom({ seed: VOICE_SEED }) }),
  });
  const sample = await synthesizer.synthesize({ text: VOICE_SAMPLE_TEXT, caption });
  const speaker = await synthesizer.encodeSpeaker({ latent: sample.latent });
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
        voice ??= await load({ caption: data.caption });
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

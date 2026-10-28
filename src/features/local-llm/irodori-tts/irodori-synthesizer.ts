import type { InferenceSession, Tensor } from "onnxruntime-web";
import {
  buildDurationFeatures,
  findFlatteningFrame,
  normalizeIrodoriText,
} from "@/features/local-llm/irodori-tts/irodori-text";

// ONNX 版（ryusei-46/Irodori-TTS-v4.1-ONNX-WebGPU）の config.json の値。
// Python の InferenceRuntime.synthesize（参照音声なし・MeanFlow 4 ステップ）と同じ順に呼ぶ。
const SAMPLE_RATE = 48_000;
const HOP_LENGTH = 1920;
const LATENT_DIM = 32;
const SPEAKER_DIM = 768;
const SPEAKER_PATCH_SIZE = 4;
const MAX_TEXT_LENGTH = 256;
const MIN_SECONDS = 0.5;
const MAX_SECONDS = 30;
const MEANFLOW_STEPS = 4;
const BOS_TOKEN_ID = 1;
const TRIM_TAIL = { windowSize: 20, stdThreshold: 0.05, meanThreshold: 0.1 };

type TensorConstructor = typeof Tensor;

export type IrodoriSessions = {
  encoder: InferenceSession;
  duration: InferenceSession;
  dit: InferenceSession;
  decoder: InferenceSession;
  speaker: InferenceSession;
};

/** 手本の声から作った話者の条件。合成に渡すと、その声に寄せて読む */
export type IrodoriSpeakerCondition = { state: Tensor; mask: Tensor };

export type IrodoriTokenizer = {
  encode: (text: string, options: { add_special_tokens: boolean }) => number[];
};

type IrodoriSynthesizerOptions = {
  Tensor: TensorConstructor;
  sessions: IrodoriSessions;
  textTokenizer: IrodoriTokenizer;
  captionTokenizer: IrodoriTokenizer;
  /** 読み違えやすい長いトークン ID → 分けて読む ID の列（tokenizer/forced_splits.json） */
  forcedSplits: Record<string, number[]>;
  annotationEmojis: readonly string[];
  /** 標準正規分布の乱数 */
  randomNormal: () => number;
};

function tokenIds({ ids }: { ids: number[] }) {
  return [BOS_TOKEN_ID, ...ids].slice(0, MAX_TEXT_LENGTH);
}

export function createIrodoriSynthesizer({
  Tensor,
  sessions,
  textTokenizer,
  captionTokenizer,
  forcedSplits,
  annotationEmojis,
  randomNormal,
}: IrodoriSynthesizerOptions) {
  const int64 = (ids: number[]) =>
    new Tensor(
      "int64",
      BigInt64Array.from(ids, (id) => BigInt(id)),
      [1, ids.length],
    );
  const allTrue = (length: number) =>
    new Tensor("bool", new Uint8Array(length).fill(1), [1, length]);
  const flag = (value: boolean) => new Tensor("bool", Uint8Array.of(value ? 1 : 0), [1]);
  // 参照音声を使わないときの話者の条件（ゼロ・マスク False）
  const noSpeaker: IrodoriSpeakerCondition = {
    state: new Tensor("float32", new Float32Array(SPEAKER_DIM), [1, 1, SPEAKER_DIM]),
    mask: new Tensor("bool", new Uint8Array(1), [1, 1]),
  };

  function encodeText({ text }: { text: string }) {
    const ids = textTokenizer
      .encode(text, { add_special_tokens: false })
      .flatMap((id) => forcedSplits[String(id)] ?? [id]);
    return tokenIds({ ids });
  }

  /**
   * 合成した音声の潜在（DACVAE の潜在そのもの）から話者の条件を作る。
   * 参照音声を DACVAE で符号化したものと同じ空間なので、波形に戻して符号化し直さずに使える。
   */
  async function encodeSpeaker({ latent }: { latent: Float32Array }) {
    // 公式の patch_sequence_with_mask と同じく、4 フレームずつ 1 つにまとめ、端数は捨てる
    const patches = Math.floor(latent.length / LATENT_DIM / SPEAKER_PATCH_SIZE);
    if (patches === 0) {
      throw new Error("手本の音声が短すぎます");
    }
    const patchDim = LATENT_DIM * SPEAKER_PATCH_SIZE;
    const { speaker_state: state, speaker_mask: mask } = await sessions.speaker.run({
      patched: new Tensor("float32", latent.slice(0, patches * patchDim), [1, patches, patchDim]),
      mask: allTrue(patches),
    });
    return { state, mask } satisfies IrodoriSpeakerCondition;
  }

  /**
   * 文章を 48 kHz モノラルの波形にする。caption は声の雰囲気の説明、speaker は寄せる声の手本。
   * latent は末尾の無音を切った潜在で、手本を作るのに使える。
   */
  async function synthesize({
    text,
    caption,
    speaker,
  }: {
    text: string;
    caption: string;
    speaker?: IrodoriSpeakerCondition;
  }) {
    const normalized = normalizeIrodoriText({ text });
    if (normalized.length === 0) {
      return { samples: new Float32Array(), latent: new Float32Array() };
    }
    const speakerCondition = speaker ?? noSpeaker;
    const textIds = encodeText({ text: normalized });
    const captionIds = tokenIds({
      ids: captionTokenizer.encode(caption.trim(), { add_special_tokens: false }),
    });
    const textMask = allTrue(textIds.length);
    const captionMask = allTrue(captionIds.length);

    const { text_state: textState, caption_state: captionState } = await sessions.encoder.run({
      text_ids: int64(textIds),
      text_mask: textMask,
      caption_ids: int64(captionIds),
      caption_mask: captionMask,
    });

    const features = buildDurationFeatures({
      text: normalized,
      tokenCount: textIds.length,
      maxTextLength: MAX_TEXT_LENGTH,
      annotationEmojis,
      hasSpeaker: speaker !== undefined,
    });
    const { log_frames: logFrames } = await sessions.duration.run({
      text_state: textState,
      text_mask: textMask,
      speaker_state: speakerCondition.state,
      speaker_mask: speakerCondition.mask,
      caption_state: captionState,
      caption_mask: captionMask,
      features: new Tensor("float32", features, [1, features.length]),
      has_speaker: flag(speaker !== undefined),
      has_caption: flag(true),
    });
    const predicted = Math.round(Math.expm1((logFrames.data as Float32Array)[0]));
    const frames = Math.min(
      Math.max(predicted, Math.ceil((MIN_SECONDS * SAMPLE_RATE) / HOP_LENGTH)),
      Math.floor((MAX_SECONDS * SAMPLE_RATE) / HOP_LENGTH),
    );

    // MeanFlow: t を 1 → 0 へ等間隔に 4 ステップ進める
    const latent = Float32Array.from({ length: frames * LATENT_DIM }, randomNormal);
    for (let step = 0; step < MEANFLOW_STEPS; step += 1) {
      const t = 1 - step / MEANFLOW_STEPS;
      const deltaT = 1 / MEANFLOW_STEPS;
      const { v } = await sessions.dit.run({
        x_t: new Tensor("float32", latent, [1, frames, LATENT_DIM]),
        t: new Tensor("float32", Float32Array.of(t), [1]),
        delta_t: new Tensor("float32", Float32Array.of(deltaT), [1]),
        text_state: textState,
        text_mask: textMask,
        speaker_state: speakerCondition.state,
        speaker_mask: speakerCondition.mask,
        caption_state: captionState,
        caption_mask: captionMask,
      });
      const velocity = v.data as Float32Array;
      for (let index = 0; index < latent.length; index += 1) {
        latent[index] -= velocity[index] * deltaT;
      }
    }

    const { audio } = await sessions.decoder.run({
      latent: new Tensor("float32", latent, [1, frames, LATENT_DIM]),
    });
    const samples = audio.data as Float32Array;
    const flatFrame = findFlatteningFrame({ latent, frames, dims: LATENT_DIM, ...TRIM_TAIL });
    const spokenFrames = flatFrame > 0 ? flatFrame : frames;
    return {
      samples: samples.slice(0, Math.min(samples.length, spokenFrames * HOP_LENGTH)),
      latent: latent.slice(0, spokenFrames * LATENT_DIM),
    };
  }

  return { sampleRate: SAMPLE_RATE, synthesize, encodeSpeaker };
}

/** 種から決まる一様乱数（mulberry32）。同じ種なら毎回同じ声の手本を作れる */
export function createSeededRandom({ seed }: { seed: number }) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller 法で標準正規分布の乱数を作る */
export function createRandomNormal({ random = Math.random }: { random?: () => number } = {}) {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const value = spare;
      spare = null;
      return value;
    }
    const radius = Math.sqrt(-2 * Math.log(1 - random()));
    const angle = 2 * Math.PI * random();
    spare = radius * Math.sin(angle);
    return radius * Math.cos(angle);
  };
}

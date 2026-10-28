// 手本の音声から、読み上げの声（手本の潜在）を作る（手順 3）。
// 使い方は README.md。サイトの読み上げと同じ合成のコードを、onnxruntime-node（CPU）で動かす。

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PreTrainedTokenizer } from "@huggingface/transformers";
import * as ort from "onnxruntime-node";
import { it } from "vitest";
import {
  createIrodoriSynthesizer,
  createRandomNormal,
  createSeededRandom,
  type IrodoriSessions,
} from "@/features/local-llm/irodori-tts/irodori-synthesizer";
import { UTOPIA_VOICE } from "@/features/local-llm/irodori-tts/utopia-voice";

const SAMPLE_RATE = 48_000;
const HOP_LENGTH = 1920;
const SEED = 1;
// 手本を Irodori 自身に読み直させる回数。Qwen の声は日本語の抑揚が崩れていて、そのまま手本にすると
// 崩れも移るため、Irodori が読んだ日本語を次の手本にする。1 回（qb3 の gen2）が、声質を残しつつ抑揚が整った
const REREAD_COUNT = 1;
const REREAD_TEXT =
  "こんにちは、ボクはゆーとぴあ。今日はどんなことを一緒に考えようか。ボク、気になることがあると、ついつい調べちゃうんだよね。";
const PREVIEW_LINES = [
  "こんにちは、ボクはゆーとぴあ。富士山のことだね、ボクも好きな山なんだ。",
  "標高は3776メートルで、晴れた日には東京からも見えるんだって。",
];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`環境変数 ${name} を指定してください（README.md）`);
  }
  return value;
}

const onnxDir = requireEnv("IRODORI_ONNX_DIR");
const referencePath = requireEnv("REFERENCE_WAV");
const outDir = process.env.OUT_DIR ?? "tmp/utopia-voice";
const latentPath = path.join("public", UTOPIA_VOICE.referenceLatentPath);

const readJson = (file: string) => JSON.parse(readFileSync(path.join(onnxDir, file), "utf8"));

function createSession({ name }: { name: string }) {
  return ort.InferenceSession.create(path.join(onnxDir, `${name}.onnx`), {
    externalData: [
      {
        path: `${path.basename(name)}.onnx.data`,
        data: readFileSync(path.join(onnxDir, `${name}.onnx.data`)),
      },
    ],
  });
}

/** prepare_reference.py が書いた 32 bit float の wav を読む */
function readFloatWav({ file }: { file: string }) {
  const bytes = readFileSync(file);
  let offset = 12;
  while (offset < bytes.length) {
    const id = bytes.toString("ascii", offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === "data") {
      return new Float32Array(
        bytes.buffer.slice(bytes.byteOffset + offset + 8, bytes.byteOffset + offset + 8 + size),
      );
    }
    offset += 8 + size + (size % 2);
  }
  throw new Error(`${file} に音声のデータがありません`);
}

function writeWav({ file, samples }: { file: string; samples: Float32Array }) {
  const bytes = Buffer.alloc(44 + samples.length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(36 + samples.length * 2, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(SAMPLE_RATE, 24);
  bytes.writeUInt32LE(SAMPLE_RATE * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((sample, index) => {
    bytes.writeInt16LE(
      Math.max(-32768, Math.min(32767, Math.round(sample * 32767))),
      44 + index * 2,
    );
  });
  writeFileSync(file, bytes);
}

/**
 * 読み直した音声を手本の形にする。音量は RMS で -16 dB 付近へそろえる近似で、BS.1770 ではない
 * （聞いて選んだ qb3 の gen2 をこの処理で作ったので、作り直しても同じ声になるよう変えない）
 */
function toReference({ samples }: { samples: Float32Array }) {
  const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  const gain = 10 ** (-16 / 20) / 1.4 / rms;
  const scaled = samples.map((value) => value * gain);
  const peak = scaled.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const limited = peak > 1 ? scaled.map((value) => value / peak) : scaled;
  const pad = (HOP_LENGTH - (limited.length % HOP_LENGTH)) % HOP_LENGTH;
  const padded = new Float32Array(limited.length + pad);
  padded.set(limited);
  for (let index = 0; index < pad; index += 1) {
    padded[limited.length + index] = limited[limited.length - 2 - index];
  }
  return padded;
}

it("手本の音声から読み上げの声を作る", async () => {
  mkdirSync(outDir, { recursive: true });
  const tokenizerConfig = readJson("tokenizer/tokenizer_config.json");
  const dacEncoder = await createSession({ name: "shared/dac_encoder" });
  const sessions = {
    encoder: await createSession({ name: "shared/encoder" }),
    duration: await createSession({ name: "shared/duration" }),
    dit: await createSession({ name: "dit-meanflow/dit" }),
    decoder: await createSession({ name: "shared/decoder" }),
    speaker: await createSession({ name: "shared/speaker" }),
  } as unknown as IrodoriSessions;
  const synthesizer = createIrodoriSynthesizer({
    Tensor: ort.Tensor as never,
    sessions,
    textTokenizer: new PreTrainedTokenizer(
      readJson("tokenizer/tokenizer_text.json"),
      tokenizerConfig,
    ),
    captionTokenizer: new PreTrainedTokenizer(
      readJson("tokenizer/tokenizer_caption.json"),
      tokenizerConfig,
    ),
    forcedSplits: readJson("tokenizer/forced_splits.json"),
    annotationEmojis: readJson("tokenizer/annotation_emojis.json"),
    randomNormal: createRandomNormal({ random: createSeededRandom({ seed: SEED }) }),
  });

  const encodeLatent = async ({ wav }: { wav: Float32Array }) => {
    const { latent } = await dacEncoder.run({
      wav: new ort.Tensor("float32", wav, [1, 1, wav.length]),
    });
    return latent.data as Float32Array;
  };

  let reference = readFloatWav({ file: referencePath });
  for (let count = 0; count < REREAD_COUNT; count += 1) {
    const speaker = await synthesizer.encodeSpeaker({
      latent: await encodeLatent({ wav: reference }),
    });
    const { samples } = await synthesizer.synthesize({
      text: REREAD_TEXT,
      caption: UTOPIA_VOICE.caption,
      speaker,
    });
    reference = toReference({ samples });
  }
  const latent = await encodeLatent({ wav: reference });
  writeFileSync(latentPath, Buffer.from(latent.buffer, latent.byteOffset, latent.byteLength));
  writeWav({ file: path.join(outDir, "reference.wav"), samples: reference });

  const speaker = await synthesizer.encodeSpeaker({ latent });
  const pieces: Float32Array[] = [];
  for (const text of PREVIEW_LINES) {
    const { samples } = await synthesizer.synthesize({
      text,
      caption: UTOPIA_VOICE.caption,
      speaker,
    });
    pieces.push(samples, new Float32Array(SAMPLE_RATE * 0.15));
  }
  const preview = new Float32Array(pieces.reduce((sum, piece) => sum + piece.length, 0));
  pieces.reduce((offset, piece) => {
    preview.set(piece, offset);
    return offset + piece.length;
  }, 0);
  writeWav({ file: path.join(outDir, "preview.wav"), samples: preview });
  console.log(
    `${latentPath}（${latent.length / 32} フレーム）と ${outDir} の試聴用の音声を書き出しました`,
  );
});

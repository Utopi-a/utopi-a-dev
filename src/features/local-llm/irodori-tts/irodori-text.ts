// Irodori-TTS（Aratako/Irodori-TTS の irodori_tts/text_normalization.py と duration.py）の前処理を移植したもの。
// 長さの予測は文章の文字種や句読点の数を特徴量に使うので、Python と同じ数え方（コードポイント単位）にする。

const SIMPLE_REPLACEMENTS: [string, string][] = [
  ["\t", ""],
  ["[n]", ""],
  ["　", ""],
  ["？", "?"],
  ["！", "!"],
  ["♥", "♡"],
  ["●", "○"],
  ["◯", "○"],
  ["〇", "○"],
];

const REGEX_REPLACEMENTS: [RegExp, string][] = [
  [/[;▼♀♂《》≪≫①②③④⑤⑥]/gu, ""],
  [/[˗‐-―⁃−⎯⏤─━⸺⸻]/gu, ""],
  [/[～〜]/gu, "ー"],
  [/…{3,}/gu, "……"],
];

const BRACKET_PAIRS: Record<string, string> = {
  "「": "」",
  "『": "』",
  "（": "）",
  "【": "】",
  "(": ")",
};

/** 文章全体を囲む括弧を外す（「…」で丸ごと囲まれた台詞など） */
function stripOuterBrackets({ text }: { text: string }) {
  let current = text;
  for (;;) {
    const chars = [...current];
    if (chars.length < 2) {
      return current;
    }
    const start = chars[0];
    const end = chars.at(-1);
    if (BRACKET_PAIRS[start] !== end) {
      return current;
    }
    let depth = 0;
    for (const [index, char] of chars.entries()) {
      if (char === start) {
        depth += 1;
      } else if (char === end) {
        depth -= 1;
      }
      if (depth === 0 && index < chars.length - 1) {
        return current;
      }
    }
    if (depth !== 0) {
      return current;
    }
    current = chars.slice(1, -1).join("");
  }
}

export function normalizeIrodoriText({ text }: { text: string }) {
  let normalized = text;
  for (const [from, to] of SIMPLE_REPLACEMENTS) {
    normalized = normalized.replaceAll(from, to);
  }
  for (const [pattern, to] of REGEX_REPLACEMENTS) {
    normalized = normalized.replace(pattern, to);
  }
  normalized = stripOuterBrackets({ text: normalized }).normalize("NFKC");
  return normalized.replaceAll("...", "…").replaceAll("..", "…").trim();
}

function log1pCap({ value, cap }: { value: number; cap: number }) {
  return Math.log1p(Math.min(Math.max(value, 0), cap)) / Math.log1p(cap);
}

function countOf({ text, needles }: { text: string; needles: string[] }) {
  return needles.reduce((sum, needle) => sum + text.split(needle).length - 1, 0);
}

function isKana(code: number) {
  return (code >= 0x3040 && code <= 0x309f) || (code >= 0x30a0 && code <= 0x30ff);
}

function isKanji(code: number) {
  return (
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x20000 && code <= 0x2fa1f)
  );
}

function isAsciiAlnum(code: number) {
  return (
    (code >= 0x30 && code <= 0x39) ||
    (code >= 0x41 && code <= 0x5a) ||
    (code >= 0x61 && code <= 0x7a)
  );
}

/** 長さの予測に渡す 14 個の特徴量。最後の 1 つは話者の手本があるか */
export function buildDurationFeatures({
  text,
  tokenCount,
  maxTextLength,
  annotationEmojis,
  hasSpeaker,
}: {
  text: string;
  tokenCount: number;
  maxTextLength: number;
  annotationEmojis: readonly string[];
  hasSpeaker: boolean;
}) {
  const codes = [...text].map((char) => char.codePointAt(0) ?? 0);
  const charCount = Math.max(codes.length, 1);
  // Python 版と同じく、長い絵文字から順に重ならないように数える
  const emojiPattern = new RegExp(
    [...annotationEmojis]
      .sort((a, b) => b.length - a.length)
      .map((emoji) => emoji.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|"),
    "gu",
  );
  const emojiCount = annotationEmojis.length > 0 ? (text.match(emojiPattern)?.length ?? 0) : 0;

  return Float32Array.from([
    Math.min(Math.max(tokenCount, 0), maxTextLength) / maxTextLength,
    log1pCap({ value: charCount, cap: 512 }),
    tokenCount / charCount,
    log1pCap({ value: countOf({ text, needles: ["。", "."] }), cap: 8 }),
    log1pCap({ value: countOf({ text, needles: ["、", ","] }), cap: 16 }),
    log1pCap({ value: countOf({ text, needles: ["ー"] }), cap: 8 }),
    log1pCap({ value: countOf({ text, needles: ["…"] }), cap: 8 }),
    log1pCap({ value: countOf({ text, needles: ["！", "!"] }), cap: 8 }),
    log1pCap({ value: countOf({ text, needles: ["？", "?"] }), cap: 8 }),
    log1pCap({ value: emojiCount, cap: 8 }),
    codes.filter(isKana).length / charCount,
    codes.filter(isKanji).length / charCount,
    codes.filter(isAsciiAlnum).length / charCount,
    hasSpeaker ? 1 : 0,
  ]);
}

/**
 * 潜在の末尾で、窓の中が平ら（標準偏差・平均がしきい値未満）になる最初のフレーム。
 * 生成した長さが話した長さより長いとき、無音の後ろを切るのに使う（Python 版 find_flattening_point）。
 */
export function findFlatteningFrame({
  latent,
  frames,
  dims,
  windowSize,
  stdThreshold,
  meanThreshold,
}: {
  latent: Float32Array;
  frames: number;
  dims: number;
  windowSize: number;
  stdThreshold: number;
  meanThreshold: number;
}) {
  const valueAt = (index: number) => (index < frames * dims ? latent[index] : 0);
  const count = windowSize * dims;
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * dims;
    let sum = 0;
    for (let offset = 0; offset < count; offset += 1) {
      sum += valueAt(start + offset);
    }
    const mean = sum / count;
    let squares = 0;
    for (let offset = 0; offset < count; offset += 1) {
      squares += (valueAt(start + offset) - mean) ** 2;
    }
    if (Math.sqrt(squares / count) < stdThreshold && Math.abs(mean) < meanThreshold) {
      return frame;
    }
  }
  return frames;
}

const SENTENCE_END = /[。！？!?\n]/u;

/**
 * 生成中の返答から、`from` 文字目以降で言い終えた部分を取り出す（最後の文末記号まで）。
 * 言い終えた部分が minLength 文字に届かないうちは、次の文と一緒に読むため待つ
 * （「はい！」だけを 1 回で合成すると、抑揚がそこで切れる）。返答が終わったら（isFinal）残りを全部返す。
 */
export function takeFinishedSpeech({
  text,
  from,
  isFinal,
  minLength = 12,
}: {
  text: string;
  from: number;
  isFinal: boolean;
  minLength?: number;
}) {
  const rest = text.slice(from);
  if (isFinal) {
    return { speech: rest, next: text.length };
  }
  let end = -1;
  for (let index = rest.length - 1; index >= 0; index -= 1) {
    if (SENTENCE_END.test(rest[index])) {
      end = index + 1;
      break;
    }
  }
  if (end < 0 || [...rest.slice(0, end).trim()].length < minLength) {
    return { speech: "", next: from };
  }
  return { speech: rest.slice(0, end), next: from + end };
}

/** Irodori-TTS は日本語専用なので、かなも漢字も含まない文（英語の返答など）は読まない */
export function isJapaneseSpeech({ text }: { text: string }) {
  return [...text].some((char) => {
    const code = char.codePointAt(0) ?? 0;
    return isKana(code) || isKanji(code);
  });
}

/**
 * 読み上げる返答を文ごとに分ける。1 文ずつ合成して、最初の文ができた時点で話し始めるため。
 * 短すぎる文は次の文とまとめる（1 文ごとの合成には固定の手間がかかり、抑揚も文ごとに切れる）。
 * 箇条書きの記号は読まず、改行で終わる行には文末を補う（まとめたときに前後の行がつながらないように）。
 */
export function splitSpeechSentences({
  text,
  minLength = 12,
}: {
  text: string;
  minLength?: number;
}) {
  const pieces = text
    .replace(/^[ \t]*(?:[-+*・]|\d+[.)])[ \t]+/gmu, "")
    .replace(/[*#`>_|]/g, "")
    .split(/(?<=[。！？!?\n])/u)
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0)
    .map((piece) => (/[。！？!?、]$/u.test(piece) ? piece : `${piece}。`));
  const sentences: string[] = [];
  for (const piece of pieces) {
    const last = sentences.at(-1);
    if (last !== undefined && [...last].length < minLength) {
      sentences[sentences.length - 1] = last + piece;
    } else {
      sentences.push(piece);
    }
  }
  return sentences;
}

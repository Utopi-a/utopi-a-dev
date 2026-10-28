export type LocalLlmModality = "text" | "image" | "audio";

export type LocalLlmModelKind = "causal-lm" | "moondream" | "qwen3-vl" | "lfm3-vl";

export type LocalLlmQuantizationDtype = "q4" | "q8" | "fp16" | "q4f16";

export type LocalLlmVisionDtype = {
  embed_tokens: LocalLlmQuantizationDtype;
  vision_encoder: LocalLlmQuantizationDtype;
  decoder_model_merged: LocalLlmQuantizationDtype;
};

export type LocalLlmDtype = LocalLlmQuantizationDtype | LocalLlmVisionDtype;

export type LocalLlmLicense = {
  name: string;
  url: string;
  holder: string;
};

type LocalLlmModelBase = {
  id: string;
  label: string;
  description: string;
  huggingFaceModelId: string;
  huggingFaceUrl: string;
  modalities: LocalLlmModality[];
  estimatedDownload: string;
  license: LocalLlmLicense;
  examples: readonly string[];
};

/** Transformers.js + WebGPU で動かすモデル */
export type TransformersLocalLlmModel = LocalLlmModelBase & {
  kind: LocalLlmModelKind;
  dtype: LocalLlmDtype;
};

/** fusor-ai の WASM ランタイム（public/lfm3-omni/）で CPU 推論するモデル */
export type FusorLocalLlmModel = LocalLlmModelBase & {
  kind: "fusor-lfm3-omni";
};

export type LocalLlmModelDefinition = TransformersLocalLlmModel | FusorLocalLlmModel;

export const DEFAULT_LOCAL_LLM_MODEL_ID = "lfm3-1.7b";

export const LOCAL_LLM_MODELS: readonly LocalLlmModelDefinition[] = [
  {
    id: "lfm3-1.7b",
    label: "LFM3-1.7B",
    description: "日本語にも対応した 1.7B の多言語チャットモデル。",
    huggingFaceModelId: "onnx-community/LFM3-1.7B-ONNX",
    huggingFaceUrl: "https://huggingface.co/onnx-community/LFM3-1.7B-ONNX",
    kind: "causal-lm",
    modalities: ["text"],
    dtype: "q4f16",
    estimatedDownload: "約 1.1 GB",
    license: {
      name: "LFM Open License v1.0",
      url: "https://huggingface.co/onnx-community/LFM3-1.7B-ONNX/raw/main/LICENSE",
      holder: "Liquid AI, Inc.",
    },
    examples: [
      "時間管理スキルを向上させるためのヒントを教えてください。",
      "TypeScript の型ガードを例つきで説明してください。",
      "Explain the difference between AI and ML in simple terms.",
    ],
  },
  {
    id: "lfm2.5-1.2b-jp",
    label: "LFM2.5-1.2B-JP",
    description: "日本語特化の 1.2B チャットモデル。",
    huggingFaceModelId: "LiquidAI/LFM2.5-1.2B-JP-ONNX",
    huggingFaceUrl: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-JP-ONNX",
    kind: "causal-lm",
    modalities: ["text"],
    dtype: "q4",
    estimatedDownload: "約 1.2 GB",
    license: {
      name: "LFM Open License v1.0",
      url: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-JP-ONNX/raw/main/LICENSE",
      holder: "Liquid AI, Inc.",
    },
    examples: [
      "時間管理スキルを向上させるためのヒントを教えてください。",
      "AIとMLの違いは何ですか？",
      "フィボナッチ数列とは何ですか？",
    ],
  },
  {
    id: "lfm2.5-1.2b-instruct",
    label: "LFM2.5-1.2B-Instruct",
    description: "多言語向けの 1.2B 指示追従モデル。",
    huggingFaceModelId: "LiquidAI/LFM2.5-1.2B-Instruct-ONNX",
    huggingFaceUrl: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX",
    kind: "causal-lm",
    modalities: ["text"],
    dtype: "q4",
    estimatedDownload: "約 1.2 GB",
    license: {
      name: "LFM Open License v1.0",
      url: "https://huggingface.co/LiquidAI/LFM2.5-1.2B-Instruct-ONNX/raw/main/LICENSE",
      holder: "Liquid AI, Inc.",
    },
    examples: [
      "Explain the difference between AI and ML in simple terms.",
      "Write a short poem about the ocean.",
      "What are three tips for better sleep?",
    ],
  },
  {
    id: "qwen2.5-0.5b-instruct",
    label: "Qwen2.5-0.5B-Instruct",
    description: "軽量な 0.5B モデル。ダウンロードが小さめ。",
    huggingFaceModelId: "onnx-community/Qwen2.5-0.5B-Instruct",
    huggingFaceUrl: "https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct",
    kind: "causal-lm",
    modalities: ["text"],
    dtype: "q4",
    estimatedDownload: "約 400 MB",
    license: {
      name: "Apache License 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      holder: "Alibaba Cloud",
    },
    examples: [
      "こんにちは。自己紹介してください。",
      "TypeScript の利点を3つ挙げて。",
      "短いジョークを一つ教えて。",
    ],
  },
  {
    id: "lfm3-vl-2b",
    label: "LFM3-VL-2B",
    description: "LFM3 ベースの画像理解つき 2B チャットモデル。",
    huggingFaceModelId: "onnx-community/LFM3-VL-2B-ONNX",
    huggingFaceUrl: "https://huggingface.co/onnx-community/LFM3-VL-2B-ONNX",
    kind: "lfm3-vl",
    modalities: ["text", "image"],
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "fp16",
      decoder_model_merged: "q4f16",
    },
    estimatedDownload: "約 1.9 GB",
    license: {
      name: "LFM Open License v1.0",
      url: "https://huggingface.co/onnx-community/LFM3-VL-2B-ONNX/raw/main/LICENSE",
      holder: "Liquid AI, Inc.",
    },
    examples: [
      "この画像に何が写っていますか？",
      "画像に写っている文字を読み取ってください。",
      "この画像で注目すべき点は何ですか？",
    ],
  },
  {
    id: "lfm3-omni-2b",
    label: "LFM3-Omni-2B",
    description:
      "画像と音声も扱える 2B モデル。声で質問したり、音声を文字起こししたりできる。CPU で動き、3 GB 前後のメモリを使う。",
    huggingFaceModelId: "LiquidAI/LFM3-Omni-2B",
    huggingFaceUrl: "https://huggingface.co/LiquidAI/LFM3-Omni-2B",
    kind: "fusor-lfm3-omni",
    modalities: ["text", "image", "audio"],
    estimatedDownload: "約 2.5 GB",
    license: {
      name: "LFM Open License v1.0",
      url: "https://huggingface.co/LiquidAI/LFM3-Omni-2B/raw/main/LICENSE",
      holder: "Liquid AI, Inc.",
    },
    examples: [
      "自己紹介を短くしてください。",
      "雨の日の楽しみ方を3つ教えてください。",
      "Explain the difference between AI and ML in simple terms.",
    ],
  },
  {
    id: "moondream2",
    label: "Moondream2",
    description: "画像 + テキストの VLM。軽量なビジョン質問応答向け。",
    huggingFaceModelId: "Xenova/moondream2",
    huggingFaceUrl: "https://huggingface.co/Xenova/moondream2",
    kind: "moondream",
    modalities: ["text", "image"],
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "fp16",
      decoder_model_merged: "q4",
    },
    estimatedDownload: "約 1.5 GB",
    license: {
      name: "Apache License 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      holder: "vikhyatk / Moondream contributors",
    },
    examples: [
      "この画像に何が写っていますか？",
      "画像の雰囲気を日本語で説明してください。",
      "写っている文字を読み取ってください。",
    ],
  },
  {
    id: "qwen3-vl-2b",
    label: "Qwen3-VL-2B-Instruct",
    description: "画像理解つきの 2B チャットモデル。やや重い。",
    huggingFaceModelId: "onnx-community/Qwen3-VL-2B-Instruct-ONNX",
    huggingFaceUrl: "https://huggingface.co/onnx-community/Qwen3-VL-2B-Instruct-ONNX",
    kind: "qwen3-vl",
    modalities: ["text", "image"],
    dtype: {
      embed_tokens: "fp16",
      vision_encoder: "fp16",
      decoder_model_merged: "q4f16",
    },
    estimatedDownload: "約 2 GB",
    license: {
      name: "Apache License 2.0",
      url: "https://www.apache.org/licenses/LICENSE-2.0",
      holder: "Alibaba Cloud",
    },
    examples: [
      "画像の内容を詳しく説明してください。",
      "この画像で注目すべき点は何ですか？",
      "画像に写っている物体を列挙してください。",
    ],
  },
] as const;

export function getLocalLlmModelById({
  modelId,
}: {
  modelId: string;
}): LocalLlmModelDefinition | undefined {
  return LOCAL_LLM_MODELS.find((model) => model.id === modelId);
}

export function modelSupportsImages({ model }: { model: LocalLlmModelDefinition }): boolean {
  return model.modalities.includes("image");
}

export function modelSupportsAudio({ model }: { model: LocalLlmModelDefinition }): boolean {
  return model.modalities.includes("audio");
}

/** Transformers.js の画像モデルは、会話の最初に画像がないと応答できない */
export function modelRequiresImage({ model }: { model: LocalLlmModelDefinition }): boolean {
  return model.kind !== "fusor-lfm3-omni" && modelSupportsImages({ model });
}

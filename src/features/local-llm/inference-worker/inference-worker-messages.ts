import type {
  FusorLocalLlmModel,
  LocalLlmDtype,
  LocalLlmModelKind,
} from "@/features/local-llm/model-registry/local-llm-models";

export type InferenceImageAttachment = {
  dataUrl: string;
  name: string;
  mimeType: string;
};

/** 16 kHz モノラルの音声 */
export type InferenceAudioClip = {
  name: string;
  samples: Float32Array;
};

/** モデルが呼び出したツール。引数の値は型の付かない文字列で返る */
export type InferenceToolCall = {
  id: string;
  name: string;
  arguments: Record<string, string>;
};

/** モデルに渡すツールの定義（JSON Schema の function 形式） */
export type InferenceTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, { type: "string"; description: string }>;
      required: string[];
    };
  };
};

export type InferenceMessage = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  images?: InferenceImageAttachment[];
  audio?: InferenceAudioClip[];
  /** assistant がこのターンで呼び出したツール */
  toolCalls?: InferenceToolCall[];
  /** role が tool のとき、どの呼び出しへの結果か */
  toolCallId?: string;
};

/** 音声を扱うモデルの返答のしかた。文字起こし・読み上げは言語を指定する */
export type LocalLlmReplyMode =
  | { mode: "text" }
  | { mode: "transcribe"; language: "Japanese" | "English" };

export type WorkerModelConfig = {
  huggingFaceModelId: string;
  kind: LocalLlmModelKind;
  dtype: LocalLlmDtype;
};

export type InferenceWorkerCommand =
  | { type: "check" }
  | { type: "load"; model: WorkerModelConfig | Pick<FusorLocalLlmModel, "kind"> }
  | {
      type: "generate";
      data: InferenceMessage[];
      replyMode?: LocalLlmReplyMode;
      /** 呼び出せるツール。いまは LFM3-VL だけがテンプレートに渡す */
      tools?: InferenceTool[];
    }
  | { type: "interrupt" }
  | { type: "reset" };

export type DownloadProgress = {
  status: "initiate" | "progress" | "done";
  file: string;
  /** 取得済みのバイト数（Omni はパート数）。Transformers.js の `progress` は百分率なので使わない */
  loaded?: number;
  total?: number;
};

export type InferenceWorkerEvent =
  | { status: "loading"; data: string }
  | { status: "initiate"; file: string; loaded: number; total: number }
  | { status: "progress"; file: string; loaded: number; total: number }
  | { status: "done"; file: string }
  | { status: "ready"; modelId: string }
  | { status: "start" }
  | { status: "update"; output: string; tps: number | null; numTokens: number }
  | { status: "complete" }
  | { status: "error"; data: string }
  /** 読み込んだモデルはそのまま使える、1 回の返答だけの失敗 */
  | { status: "generation-error"; data: string };

export type InferenceWorkerEventSender = (event: InferenceWorkerEvent) => void;

export type LocalLlmChatPhase = "idle" | "loading" | "ready" | "generating";

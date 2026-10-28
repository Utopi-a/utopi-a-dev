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

export type InferenceMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: InferenceImageAttachment[];
  audio?: InferenceAudioClip[];
};

/** 音声を扱うモデルの返答のしかた。文字起こし・読み上げは言語を指定する */
export type LocalLlmReplyMode =
  | { mode: "text" | "interleaved" }
  | { mode: "transcribe" | "speech"; language: "Japanese" | "English" };

export type WorkerModelConfig = {
  huggingFaceModelId: string;
  kind: LocalLlmModelKind;
  dtype: LocalLlmDtype;
};

export type InferenceWorkerCommand =
  | { type: "check" }
  | { type: "load"; model: WorkerModelConfig | Pick<FusorLocalLlmModel, "kind"> }
  | { type: "generate"; data: InferenceMessage[]; replyMode?: LocalLlmReplyMode }
  | { type: "interrupt" }
  | { type: "reset" };

export type DownloadProgress = {
  status: "initiate" | "progress" | "done";
  file: string;
  progress?: number;
  total?: number;
};

export type InferenceWorkerEvent =
  | { status: "loading"; data: string }
  | { status: "initiate"; file: string; progress: number; total: number }
  | { status: "progress"; file: string; progress: number; total: number }
  | { status: "done"; file: string }
  | { status: "ready"; modelId: string }
  | { status: "start" }
  | { status: "update"; output: string; tps: number | null; numTokens: number }
  | { status: "speech"; seconds: number }
  | { status: "complete" }
  | { status: "error"; data: string }
  /** 読み込んだモデルはそのまま使える、1 回の返答だけの失敗 */
  | { status: "generation-error"; data: string };

export type InferenceWorkerEventSender = (event: InferenceWorkerEvent) => void;

export type LocalLlmChatPhase = "idle" | "loading" | "ready" | "generating";

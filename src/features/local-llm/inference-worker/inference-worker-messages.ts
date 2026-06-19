import type {
  LocalLlmDtype,
  LocalLlmModelKind,
} from "@/features/local-llm/model-registry/local-llm-models";

export type InferenceImageAttachment = {
  dataUrl: string;
  name: string;
  mimeType: string;
};

export type InferenceMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  images?: InferenceImageAttachment[];
};

export type WorkerModelConfig = {
  huggingFaceModelId: string;
  kind: LocalLlmModelKind;
  dtype: LocalLlmDtype;
};

export type InferenceWorkerCommand =
  | { type: "check" }
  | { type: "load"; model: WorkerModelConfig }
  | { type: "generate"; data: InferenceMessage[] }
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
  | { status: "complete" }
  | { status: "error"; data: string };

export type InferenceWorkerEventSender = (event: InferenceWorkerEvent) => void;

export type LocalLlmChatPhase = "idle" | "loading" | "ready" | "generating";

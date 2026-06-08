export type LfmInferenceMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type LfmChatMessage = LfmInferenceMessage & {
  id: string;
};

export type LfmWorkerCommand =
  | { type: "check" }
  | { type: "load" }
  | { type: "generate"; data: LfmInferenceMessage[] }
  | { type: "interrupt" }
  | { type: "reset" };

export type LfmDownloadProgress = {
  status: "initiate" | "progress" | "done";
  file: string;
  progress?: number;
  total?: number;
};

export type LfmWorkerEvent =
  | { status: "loading"; data: string }
  | { status: "initiate"; file: string; progress: number; total: number }
  | { status: "progress"; file: string; progress: number; total: number }
  | { status: "done"; file: string }
  | { status: "ready" }
  | { status: "start" }
  | { status: "update"; output: string; tps: number | null; numTokens: number }
  | { status: "complete" }
  | { status: "error"; data: string };

export type LfmChatPhase = "idle" | "loading" | "ready" | "generating";

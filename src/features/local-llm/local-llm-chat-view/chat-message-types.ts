export type ChatImageAttachment = {
  id: string;
  dataUrl: string;
  name: string;
  mimeType: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: ChatImageAttachment[];
  audio?: ChatAudioClip[];
  /** 返答が音声で話した長さ（秒） */
};

/** 16 kHz モノラルの音声（録音または音声ファイル） */
export type ChatAudioClip = {
  id: string;
  name: string;
  seconds: number;
  samples: Float32Array;
};

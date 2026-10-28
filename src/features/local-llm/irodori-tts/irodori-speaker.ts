import {
  isJapaneseSpeech,
  splitSpeechSentences,
} from "@/features/local-llm/irodori-tts/irodori-text";
import type {
  IrodoriWorkerCommand,
  IrodoriWorkerEvent,
} from "@/features/local-llm/irodori-tts/irodori-tts-worker";

/** 声の雰囲気の説明。Irodori-TTS v4.1 はこの文章から声を作る（誰かの声を複製しない） */
export const DEFAULT_IRODORI_CAPTION = "落ち着いた若い女性の声で、やさしく話す。";

export type IrodoriSpeaker = {
  /** 文章を文ごとに合成し、前の音声の直後に続けて鳴らす。日本語専用のモデルなので日本語でない文は飛ばす */
  speak: (options: { text: string }) => Promise<void>;
  /** 鳴っている音声と、まだ合成していない文を捨てる */
  stop: () => void;
  dispose: () => void;
};

export async function loadIrodoriSpeaker({
  caption = DEFAULT_IRODORI_CAPTION,
  onProgress,
}: {
  caption?: string;
  onProgress: (progress: { loaded: number; total: number }) => void;
}): Promise<IrodoriSpeaker> {
  const worker = new Worker(new URL("./irodori-tts-worker.ts", import.meta.url), {
    type: "module",
    name: "irodori-tts",
  });
  const send = (command: IrodoriWorkerCommand) => worker.postMessage(command);
  const pending = new Map<
    number,
    { resolve: (samples: Float32Array<ArrayBuffer>) => void; reject: (error: Error) => void }
  >();
  let nextId = 0;

  const sampleRate = await new Promise<number>((resolve, reject) => {
    worker.onerror = (event) =>
      reject(new Error(event.message || "読み上げの Worker が停止しました"));
    worker.onmessage = ({ data }: MessageEvent<IrodoriWorkerEvent>) => {
      switch (data.type) {
        case "progress":
          onProgress(data);
          return;
        case "ready":
          resolve(data.sampleRate);
          return;
        case "synthesized":
          pending.get(data.id)?.resolve(data.samples);
          pending.delete(data.id);
          return;
        case "error":
          if (data.id === undefined) {
            reject(new Error(data.message));
            return;
          }
          pending.get(data.id)?.reject(new Error(data.message));
          pending.delete(data.id);
          return;
      }
    };
    send({ type: "load" });
  }).catch((error: unknown) => {
    worker.terminate();
    throw error;
  });

  function synthesize({ text }: { text: string }) {
    const id = nextId++;
    return new Promise<Float32Array<ArrayBuffer>>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      send({ type: "synthesize", id, text, caption });
    });
  }

  const context = new AudioContext({ sampleRate });
  const playing = new Set<AudioBufferSourceNode>();
  let playAt = 0;
  // stop() のたびに進め、合成中だった古い文を鳴らさない
  let generation = 0;
  let queue = Promise.resolve();

  function play({ samples }: { samples: Float32Array<ArrayBuffer> }) {
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => playing.delete(source);
    playAt = Math.max(playAt, context.currentTime);
    source.start(playAt);
    playAt += buffer.duration;
    playing.add(source);
  }

  return {
    speak({ text }) {
      const current = generation;
      void context.resume();
      const job = queue.then(async () => {
        const sentences = splitSpeechSentences({ text }).filter((sentence) =>
          isJapaneseSpeech({ text: sentence }),
        );
        for (const sentence of sentences) {
          if (current !== generation) {
            return;
          }
          const samples = await synthesize({ text: sentence });
          if (current === generation && samples.length > 0) {
            play({ samples });
          }
        }
      });
      // 失敗した読み上げのあとも、次の読み上げは続けられるようにする
      queue = job.catch(() => undefined);
      return job;
    },
    stop() {
      generation += 1;
      for (const source of playing) {
        source.stop();
      }
      playing.clear();
      playAt = 0;
    },
    dispose() {
      generation += 1;
      worker.terminate();
      void context.close();
    },
  };
}

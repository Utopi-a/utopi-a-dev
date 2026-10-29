"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readAudioFile } from "@/features/local-llm/local-llm-chat-view/read-audio-file";

/**
 * ゆーとぴあちゃんの耳。日本語の聞き取りが良い Whisper large-v3-turbo を端末内で動かす。
 * q4 は Node（CPU）でも同じ重みで聞き取りを確かめられるので、q4f16 ではなく q4 にする
 */
const EARS_MODEL_ID = "onnx-community/whisper-large-v3-turbo";
const EARS_DTYPE = { encoder_model: "q4", decoder_model_merged: "q4" } as const;
/** 無音や雑音に対して Whisper がよく出す決まり文句。話しかけられていないので捨てる */
const HALLUCINATIONS = ["ご視聴ありがとうございました", "ご清聴ありがとうございました"];

export type CompanionEarsState =
  | { status: "idle" }
  | { status: "loading"; loaded: number; total: number }
  | { status: "listening" }
  | { status: "transcribing" }
  | { status: "error"; message: string };

type Transcriber = (
  samples: Float32Array,
  options: { language: string; task: string },
) => Promise<{ text: string } | { text: string }[]>;

/**
 * マイクのボタンで話しかける。押すと録音を始め、もう一度押すと聞き取って文字にする。
 * 聞き取りのモデル（約 760 MB）は、初めてマイクを使うときに読み込む
 */
export function useCompanionEars({ onHeard }: { onHeard: (text: string) => void }) {
  const [state, setState] = useState<CompanionEarsState>({ status: "idle" });
  const transcriberRef = useRef<Transcriber | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const onHeardRef = useRef(onHeard);
  onHeardRef.current = onHeard;

  const load = useCallback(async () => {
    if (transcriberRef.current) {
      return transcriberRef.current;
    }
    setState({ status: "loading", loaded: 0, total: 0 });
    const files = new Map<string, { loaded: number; total: number }>();
    const { pipeline } = await import("@huggingface/transformers");
    const transcriber = (await pipeline("automatic-speech-recognition", EARS_MODEL_ID, {
      device: "webgpu",
      dtype: EARS_DTYPE,
      progress_callback: (event: {
        status: string;
        file?: string;
        loaded?: number;
        total?: number;
      }) => {
        if (event.status !== "progress" || !event.file) {
          return;
        }
        files.set(event.file, { loaded: event.loaded ?? 0, total: event.total ?? 0 });
        const values = [...files.values()];
        setState({
          status: "loading",
          loaded: values.reduce((sum, file) => sum + file.loaded, 0),
          total: values.reduce((sum, file) => sum + file.total, 0),
        });
      },
    } as never)) as unknown as Transcriber;
    transcriberRef.current = transcriber;
    return transcriber;
  }, []);

  const transcribe = useCallback(async (recording: Blob) => {
    setState({ status: "transcribing" });
    try {
      const transcriber = transcriberRef.current;
      if (!transcriber) {
        throw new Error("聞き取りのモデルを読み込んでいません");
      }
      const { samples } = await readAudioFile({ file: recording, name: "voice" });
      const output = await transcriber(samples, { language: "japanese", task: "transcribe" });
      const text = (Array.isArray(output) ? output[0]?.text : output.text)?.trim() ?? "";
      setState({ status: "idle" });
      if (text.length > 0 && !HALLUCINATIONS.some((phrase) => text.includes(phrase))) {
        onHeardRef.current(text);
      }
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const toggle = useCallback(async () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      return;
    }
    try {
      await load();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = ({ data }) => chunks.push(data);
      recorder.onstop = () => {
        for (const track of stream.getTracks()) {
          track.stop();
        }
        recorderRef.current = null;
        void transcribe(new Blob(chunks, { type: recorder.mimeType }));
      };
      recorderRef.current = recorder;
      recorder.start();
      setState({ status: "listening" });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, [load, transcribe]);

  useEffect(
    () => () => {
      recorderRef.current?.stop();
    },
    [],
  );

  return { state, toggle };
}

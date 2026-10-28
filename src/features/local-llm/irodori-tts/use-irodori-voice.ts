"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  hasCachedIrodoriFiles,
  IRODORI_TOTAL_BYTES,
} from "@/features/local-llm/irodori-tts/irodori-model-files";
import type { IrodoriSpeaker } from "@/features/local-llm/irodori-tts/irodori-speaker";
import { takeFinishedSpeech } from "@/features/local-llm/irodori-tts/irodori-text";

export type IrodoriVoiceState =
  | { status: "off"; isDownloaded: boolean }
  | { status: "loading"; loaded: number; total: number }
  | { status: "on" }
  | { status: "error"; message: string };

/**
 * 返答を Irodori-TTS で読み上げる。どのモデルの返答でも、生成中に言い終えた文から順に読む。
 * モデル（約 1.6 GB）は初めてオンにしたときに読み込み、オフにしてもメモリに残す。
 */
export function useIrodoriVoice() {
  const speakerRef = useRef<IrodoriSpeaker | null>(null);
  const isOnRef = useRef(false);
  // 読み上げ中の返答と、どこまで読み上げに回したか。止めた返答の続きは読まない
  const followingRef = useRef<{ messageId: string | null; from: number; isMuted: boolean }>({
    messageId: null,
    from: 0,
    isMuted: false,
  });
  const [state, setState] = useState<IrodoriVoiceState>({ status: "off", isDownloaded: false });

  useEffect(() => {
    void hasCachedIrodoriFiles().then((isDownloaded) =>
      setState((prev) => (prev.status === "off" ? { status: "off", isDownloaded } : prev)),
    );
  }, []);

  useEffect(
    () => () => {
      isOnRef.current = false;
      speakerRef.current?.dispose();
    },
    [],
  );

  const turnOn = useCallback(async () => {
    if (speakerRef.current) {
      isOnRef.current = true;
      setState({ status: "on" });
      return;
    }
    setState({ status: "loading", loaded: 0, total: IRODORI_TOTAL_BYTES });
    try {
      const { loadIrodoriSpeaker } = await import(
        "@/features/local-llm/irodori-tts/irodori-speaker"
      );
      speakerRef.current = await loadIrodoriSpeaker({
        onProgress: ({ loaded, total }) => setState({ status: "loading", loaded, total }),
      });
      // 読み込み中に流れていた返答は読まない（途中から読み始めると文の頭が欠ける）
      followingRef.current.isMuted = true;
      isOnRef.current = true;
      setState({ status: "on" });
    } catch (error) {
      setState({
        status: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  const stop = useCallback(() => {
    followingRef.current.isMuted = true;
    speakerRef.current?.stop();
  }, []);

  const turnOff = useCallback(() => {
    isOnRef.current = false;
    stop();
    setState({ status: "off", isDownloaded: true });
  }, [stop]);

  /** 返答が伸びるたびに呼ぶ。言い終えた文を読み上げに回す */
  const follow = useCallback(
    ({ messageId, text, isFinal }: { messageId: string; text: string; isFinal: boolean }) => {
      const following = followingRef.current;
      if (following.messageId !== messageId) {
        followingRef.current = { messageId, from: 0, isMuted: !isOnRef.current };
      }
      const current = followingRef.current;
      if (current.isMuted || !isOnRef.current || !speakerRef.current) {
        return;
      }
      const { speech, next } = takeFinishedSpeech({ text, from: current.from, isFinal });
      current.from = next;
      if (speech.trim().length > 0) {
        void speakerRef.current.speak({ text: speech }).catch((error: unknown) => {
          isOnRef.current = false;
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        });
      }
    },
    [],
  );

  return { state, turnOn, turnOff, stop, follow };
}

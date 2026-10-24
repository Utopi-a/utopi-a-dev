"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceInputState = "off" | "starting" | "on" | "denied";

/** 声として扱い始める音量と、口が開ききる音量（RMS） */
const SILENT_RMS = 0.015;
const LOUD_RMS = 0.12;

/**
 * マイクの音量を 0〜1 に正規化して返す。値は毎フレーム読むので ref で渡し、再描画を起こさない。
 */
export function useVoiceLevel() {
  const levelRef = useRef(0);
  const [state, setState] = useState<VoiceInputState>("off");
  const stopRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    levelRef.current = 0;
    setState("off");
  }, []);

  const start = useCallback(async () => {
    setState("starting");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      setState("denied");
      return;
    }
    const context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);
    let frame = 0;

    const tick = () => {
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const sample of samples) {
        sum += sample * sample;
      }
      const rms = Math.sqrt(sum / samples.length);
      levelRef.current = Math.min(1, Math.max(0, (rms - SILENT_RMS) / (LOUD_RMS - SILENT_RMS)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    stopRef.current = () => {
      cancelAnimationFrame(frame);
      for (const track of stream.getTracks()) {
        track.stop();
      }
      void context.close();
    };
    setState("on");
  }, []);

  useEffect(() => () => stopRef.current?.(), []);

  return { levelRef, state, start, stop };
}

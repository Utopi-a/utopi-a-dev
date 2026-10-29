"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CompanionCameraState = "off" | "starting" | "on" | "denied";

/** 目に渡す画像の長い辺。LFM3-VL は画像が大きいほど画像トークンが増えて遅くなる */
const FRAME_MAX_SIDE = 512;
/** 映像が変わったかを比べるための縮小画像の大きさ */
const SAMPLE_WIDTH = 16;
const SAMPLE_HEIGHT = 12;

/**
 * 端末のカメラ。映像は画面の小さなプレビューにだけ流し、見るときに 1 枚ずつ JPEG にして目（LFM3-VL）に渡す。
 * 映像も画像も端末の外には出さない
 */
export function useCompanionCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CompanionCameraState>("off");

  const stop = useCallback(() => {
    for (const track of streamRef.current?.getTracks() ?? []) {
      track.stop();
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setState("off");
  }, []);

  /** カメラを起動する。映り始めたら true（許可されなかったときは false） */
  const start = useCallback(async () => {
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState("on");
      return true;
    } catch {
      setState("denied");
      return false;
    }
  }, []);

  /** いまの映像を 1 枚の JPEG（data URL）にする。映っていなければ null */
  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.videoWidth === 0) {
      return null;
    }
    const scale = Math.min(1, FRAME_MAX_SIDE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  /** いまの映像をごく小さく縮めた明るさの並び。映像が変わったかを比べるのに使う。映っていなければ null */
  const sample = useCallback(() => {
    const video = videoRef.current;
    if (!video || !streamRef.current || video.videoWidth === 0) {
      return null;
    }
    const canvas = document.createElement("canvas");
    canvas.width = SAMPLE_WIDTH;
    canvas.height = SAMPLE_HEIGHT;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return null;
    }
    context.drawImage(video, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
    const luminance = new Uint8Array(SAMPLE_WIDTH * SAMPLE_HEIGHT);
    for (let index = 0; index < luminance.length; index += 1) {
      const offset = index * 4;
      luminance[index] = Math.round(
        0.299 * data[offset] + 0.587 * data[offset + 1] + 0.114 * data[offset + 2],
      );
    }
    return luminance;
  }, []);

  useEffect(() => stop, [stop]);

  return { videoRef, state, start, stop, capture, sample };
}

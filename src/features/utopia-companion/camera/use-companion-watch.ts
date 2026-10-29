"use client";

import { useEffect, useRef } from "react";
import { hasFrameChanged } from "@/features/utopia-companion/camera/companion-scene";

/** 次に見るまでの間隔。話し終えて手が空いてから数える */
const WATCH_INTERVAL_MS = 12_000;
/** 映像が変わらなくても、この回数見たら何か話す（黙りっぱなしにしない） */
const MAX_QUIET_LOOKS = 3;

/**
 * カメラを一緒に見て、話し続ける。手が空いていれば一定の間隔で映像を確かめ、
 * 前に話したときから変わっていたら、その 1 枚について話す。
 * 話しかけられて考えている間や、話している間は見ない
 */
export function useCompanionWatch({
  isEnabled,
  capture,
  sample,
  isIdle,
  onScene,
}: {
  isEnabled: boolean;
  capture: () => string | null;
  sample: () => Uint8Array | null;
  isIdle: () => boolean;
  onScene: (frame: string) => Promise<void>;
}) {
  const latest = useRef({ capture, sample, isIdle, onScene });
  latest.current = { capture, sample, isIdle, onScene };

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    let isCancelled = false;
    let timer = 0;
    let previous: Uint8Array | null = null;
    let quietLooks = 0;

    async function look() {
      const { capture, sample, isIdle, onScene } = latest.current;
      if (!isIdle()) {
        return;
      }
      const current = sample();
      if (!current) {
        return;
      }
      if (!hasFrameChanged({ previous, current }) && quietLooks < MAX_QUIET_LOOKS) {
        quietLooks += 1;
        return;
      }
      const frame = capture();
      if (!frame) {
        return;
      }
      quietLooks = 0;
      previous = current;
      await onScene(frame);
    }

    function schedule() {
      timer = window.setTimeout(async () => {
        await look();
        if (!isCancelled) {
          schedule();
        }
      }, WATCH_INTERVAL_MS);
    }
    // 見始めはすぐに 1 枚見る
    timer = window.setTimeout(async () => {
      await look();
      if (!isCancelled) {
        schedule();
      }
    }, 500);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [isEnabled]);
}

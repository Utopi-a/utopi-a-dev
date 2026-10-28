"use client";

import { useEffect, useRef } from "react";
import { isSimilarScene } from "@/features/utopia-companion/camera/companion-scene";

/** 次に見るまでの間隔。話し終えて手が空いてから数える */
const WATCH_INTERVAL_MS = 12_000;
/** 様子が変わらなくても、この回数見たら何か話す（黙りっぱなしにしない） */
const MAX_QUIET_LOOKS = 3;

/**
 * カメラを一緒に見て、話し続ける。手が空いていれば一定の間隔で 1 枚見て、様子が変わったら話す。
 * 話しかけられて考えている間や、話している間は見ない
 */
export function useCompanionWatch({
  isEnabled,
  capture,
  describe,
  isIdle,
  onScene,
}: {
  isEnabled: boolean;
  capture: () => string | null;
  describe: (frame: string) => Promise<string>;
  isIdle: () => boolean;
  onScene: (caption: string) => Promise<void>;
}) {
  const latest = useRef({ capture, describe, isIdle, onScene });
  latest.current = { capture, describe, isIdle, onScene };

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    let isCancelled = false;
    let timer = 0;
    let previous = "";
    let quietLooks = 0;

    async function look() {
      const { capture, describe, isIdle, onScene } = latest.current;
      if (!isIdle()) {
        return;
      }
      const frame = capture();
      if (!frame) {
        return;
      }
      const caption = (await describe(frame).catch(() => "")).trim();
      if (isCancelled || caption.length === 0) {
        return;
      }
      if (isSimilarScene({ previous, current: caption }) && quietLooks < MAX_QUIET_LOOKS) {
        quietLooks += 1;
        return;
      }
      quietLooks = 0;
      previous = caption;
      if (latest.current.isIdle()) {
        await onScene(caption);
      }
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

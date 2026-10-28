"use client";

import { CameraIcon, CameraOffIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { useCompanionCamera } from "@/features/utopia-companion/camera/use-companion-camera";
import type { CompanionBrainState } from "@/features/utopia-companion/use-companion-models";

function megabytes({ bytes }: { bytes: number }) {
  return Math.round(bytes / 1e6).toLocaleString();
}

/** カメラで一緒に見るための切り替えと、映像の小さなプレビュー */
export function CompanionCameraControl({
  camera,
  eyesState,
  onStart,
}: {
  camera: ReturnType<typeof useCompanionCamera>;
  eyesState: CompanionBrainState;
  onStart: () => void;
}) {
  const isOn = camera.state === "on";
  const status =
    eyesState.status === "waking"
      ? eyesState.total > 0 && eyesState.loaded < eyesState.total
        ? `目を読み込み中 ${megabytes({ bytes: eyesState.loaded })} / ${megabytes({ bytes: eyesState.total })} MB`
        : "目を準備中…"
      : eyesState.status === "error"
        ? eyesState.message
        : camera.state === "denied"
          ? "カメラを使えません。ブラウザでカメラの使用を許可してください"
          : isOn && eyesState.status === "awake"
            ? "一緒に見てるよ。気になったことを話すね"
            : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        size="sm"
        variant={isOn ? "default" : "outline"}
        aria-pressed={isOn}
        disabled={camera.state === "starting"}
        onClick={isOn ? camera.stop : onStart}
      >
        {isOn ? <CameraIcon className="size-4" /> : <CameraOffIcon className="size-4" />}
        カメラで一緒に見る
      </Button>
      {status ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {eyesState.status === "waking" ? <Loader2Icon className="size-3 animate-spin" /> : null}
          {status}
        </p>
      ) : null}
      <video
        ref={camera.videoRef}
        muted
        playsInline
        aria-label="カメラの映像"
        className={isOn ? "w-40 rounded-lg" : "hidden"}
      />
    </div>
  );
}

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
  visionState,
  onStart,
}: {
  camera: ReturnType<typeof useCompanionCamera>;
  visionState: CompanionBrainState;
  onStart: () => Promise<void>;
}) {
  const isOn = camera.state === "on";
  const status =
    camera.state === "denied"
      ? "カメラを使えません。ブラウザ（と OS）の設定で、このサイトにカメラの使用を許可してください"
      : visionState.status === "waking"
        ? visionState.total > 0 && visionState.loaded < visionState.total
          ? `目を読み込み中 ${megabytes({ bytes: visionState.loaded })} / ${megabytes({ bytes: visionState.total })} MB`
          : "目を準備中…"
        : visionState.status === "error"
          ? visionState.message
          : isOn && visionState.status === "awake"
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
        onClick={isOn ? camera.stop : () => void onStart()}
      >
        {isOn ? <CameraIcon className="size-4" /> : <CameraOffIcon className="size-4" />}
        カメラで一緒に見る
      </Button>
      {status ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {visionState.status === "waking" ? <Loader2Icon className="size-3 animate-spin" /> : null}
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

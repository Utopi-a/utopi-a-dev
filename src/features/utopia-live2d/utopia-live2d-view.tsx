"use client";

import { MicIcon, MicOffIcon } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { useVoiceLevel } from "@/features/utopia-live2d/use-voice-level";
import { utopiaExpressions } from "@/features/utopia-live2d/utopia-expressions";
import {
  type Live2DStageHandle,
  UtopiaLive2DStage,
} from "@/features/utopia-live2d/utopia-live2d-stage";

const voiceLabel = {
  off: "マイクで話す",
  starting: "マイクを準備中",
  on: "マイクを止める",
  denied: "マイクを使えません",
} as const;

export function UtopiaLive2DView() {
  const handleRef = useRef<Live2DStageHandle | null>(null);
  const [expression, setExpression] = useState<string>(utopiaExpressions[0].id);
  const voice = useVoiceLevel();

  function selectExpression(id: string) {
    setExpression(id);
    const preset = utopiaExpressions.find((item) => item.id === id);
    handleRef.current?.setExpression(preset?.modelExpression ?? null);
  }

  return (
    <div className="space-y-10">
      <PageHeader
        parent={{ href: "/lab", label: "Lab" }}
        title="ゆーとぴあちゃん"
        description="カーソルを目で追い、まばたきし、髪が揺れます。頭を撫でたり顔をタップしたりすると反応します。"
      />

      <div className="flex flex-col items-center gap-8 sm:flex-row sm:items-start">
        <UtopiaLive2DStage
          handleRef={handleRef}
          voiceLevelRef={voice.levelRef}
          reactionExpression="shy"
        />

        <div className="w-full space-y-8 sm:max-w-56">
          <section className="space-y-3">
            <h2 className="pf-heading">表情</h2>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-2">
              {utopiaExpressions.map(({ id, label }) => (
                <Button
                  key={id}
                  variant={expression === id ? "default" : "outline"}
                  aria-pressed={expression === id}
                  onClick={() => selectExpression(id)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="pf-heading">声</h2>
            <Button
              variant={voice.state === "on" ? "default" : "outline"}
              className="w-full"
              disabled={voice.state === "starting"}
              onClick={() => (voice.state === "on" ? voice.stop() : void voice.start())}
            >
              {voice.state === "on" ? <MicOffIcon /> : <MicIcon />}
              {voiceLabel[voice.state]}
            </Button>
            {voice.state === "denied" ? (
              <p className="text-sm text-muted-foreground">
                ブラウザでマイクの使用を許可すると、声に合わせて口が動きます。
              </p>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}

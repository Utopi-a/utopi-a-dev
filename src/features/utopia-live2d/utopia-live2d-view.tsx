"use client";

import { MicIcon, MicOffIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { CompanionTalkPanel } from "@/features/utopia-companion/companion-talk-panel";
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
  const speechLevelRef = useRef(0);
  const mouthLevelRef = useRef(0);

  // 口はマイクの声と、ゆーとぴあちゃんの読み上げの大きいほうで開ける
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      mouthLevelRef.current = Math.max(voice.levelRef.current, speechLevelRef.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [voice.levelRef]);

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

      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start">
        {/* 話す欄に幅を残すため、横に並べるときはモデルを小さくする */}
        <div className="w-full max-w-md lg:w-80 lg:shrink-0">
          <UtopiaLive2DStage
            handleRef={handleRef}
            voiceLevelRef={mouthLevelRef}
            reactionExpression="shy"
          />
        </div>

        <div className="w-full max-w-md min-w-0 space-y-8 lg:max-w-none lg:flex-1">
          <section className="space-y-3">
            <h2 className="pf-heading">話す</h2>
            <CompanionTalkPanel
              speechLevelRef={speechLevelRef}
              onReply={({ expression }) => {
                selectExpression(expression);
                handleRef.current?.playMotion("Nod");
              }}
            />
          </section>

          <section className="space-y-3">
            <h2 className="pf-heading">表情</h2>
            <div className="grid grid-cols-3 gap-2">
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

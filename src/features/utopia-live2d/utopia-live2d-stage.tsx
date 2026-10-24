"use client";

import Image from "next/image";
import { type RefObject, useEffect, useRef, useState } from "react";
import { loadCubismCore } from "@/features/utopia-live2d/load-cubism-core";

const MODEL_URL = "/utopia-live2d/utopia.model3.json";
/** 頭を撫でたと見なす範囲（モデルの高さに対する上からの割合） */
const HEAD_PAT_RATIO = 0.3;
const REACTION_MILLISECONDS = 2200;

type StageStatus = "loading" | "ready" | "unsupported";

/** 表示中のモデルへの操作。表情の切り替えなどはページ側から呼ぶ */
export type Live2DStageHandle = {
  setExpression: (name: string | null) => void;
};

export function UtopiaLive2DStage({
  handleRef,
  voiceLevelRef,
  reactionExpression,
}: {
  handleRef: RefObject<Live2DStageHandle | null>;
  voiceLevelRef: RefObject<number>;
  /** 頭を撫でたときに一時的に出す表情 */
  reactionExpression: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<StageStatus>("loading");
  const reactionRef = useRef(reactionExpression);
  reactionRef.current = reactionExpression;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    let disposed = false;
    let cleanup = () => {};

    async function start(target: HTMLDivElement) {
      const probe = document.createElement("canvas").getContext("webgl2");
      if (!probe) {
        setStatus("unsupported");
        return;
      }
      await loadCubismCore();
      const [{ Application, extensions }, { Live2DModel, Live2DPlugin }] = await Promise.all([
        import("pixi.js"),
        import("untitled-pixi-live2d-engine/cubism"),
      ]);
      if (disposed) {
        return;
      }
      extensions.add(Live2DPlugin);
      const app = new Application();
      await app.init({
        backgroundAlpha: 0,
        antialias: true,
        autoDensity: true,
        resolution: Math.min(window.devicePixelRatio || 1, 2),
        resizeTo: target,
        preference: "webgl",
      });
      const model = await Live2DModel.from(MODEL_URL, { autoFocus: true, autoHitTest: false });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      target.append(app.canvas);
      app.canvas.setAttribute("role", "img");
      app.canvas.setAttribute("aria-label", "ゆーとぴあちゃん");
      app.canvas.classList.add("size-full", "touch-pan-y", "select-none");
      model.anchor.set(0.5, 0.5);
      app.stage.addChild(model);

      function layout() {
        const scale = Math.min(
          app.screen.width / model.internalModel.width,
          app.screen.height / model.internalModel.height,
        );
        model.scale.set(scale);
        model.position.set(app.screen.width / 2, app.screen.height / 2);
      }
      layout();
      app.renderer.on("resize", layout);

      // マイクの音量で口を開ける。モーションが書き込んだ値より大きいときだけ上書きする
      const coreModel = model.internalModel.coreModel as unknown as {
        getParameterCount(): number;
        getParameterId(index: number): { getString(): { s: string } };
        getParameterValueByIndex(index: number): number;
        setParameterValueByIndex(index: number, value: number): void;
      };
      let mouthIndex = -1;
      for (let index = 0; index < coreModel.getParameterCount(); index++) {
        if (coreModel.getParameterId(index).getString().s === "ParamMouthOpenY") {
          mouthIndex = index;
        }
      }
      model.internalModel.on("beforeModelUpdate", () => {
        const level = voiceLevelRef.current;
        if (mouthIndex >= 0 && level > 0) {
          const current = coreModel.getParameterValueByIndex(mouthIndex);
          coreModel.setParameterValueByIndex(mouthIndex, Math.max(current, level));
        }
      });

      let currentExpression: string | null = null;
      let reactionTimer = 0;
      function applyExpression(name: string | null) {
        if (name) {
          void model.expression(name);
        } else {
          model.internalModel.motionManager.expressionManager?.resetExpression();
        }
      }
      handleRef.current = {
        setExpression(name) {
          currentExpression = name;
          window.clearTimeout(reactionTimer);
          applyExpression(name);
        },
      };

      function handleTap(event: PointerEvent) {
        const bounds = app.canvas.getBoundingClientRect();
        const modelTop = model.y - model.height / 2;
        const y = ((event.clientY - bounds.top) * app.screen.height) / bounds.height;
        const isHead = y < modelTop + model.height * HEAD_PAT_RATIO;
        if (isHead) {
          applyExpression(reactionRef.current);
          window.clearTimeout(reactionTimer);
          reactionTimer = window.setTimeout(
            () => applyExpression(currentExpression),
            REACTION_MILLISECONDS,
          );
        }
        void model.motion(isHead ? "Shake" : "Nod");
      }
      app.canvas.addEventListener("pointerdown", handleTap);
      setStatus("ready");

      cleanup = () => {
        window.clearTimeout(reactionTimer);
        app.canvas.removeEventListener("pointerdown", handleTap);
        handleRef.current = null;
        app.destroy(true, { children: true });
      };
    }

    start(container).catch(() => setStatus("unsupported"));
    return () => {
      disposed = true;
      cleanup();
    };
  }, [handleRef, voiceLevelRef]);

  return (
    // 絵は胸の下で切れているので、下端を地の色へ溶かす
    <div className="relative aspect-[2/3] w-full max-w-md [mask-image:linear-gradient(to_bottom,#000_86%,transparent)]">
      {status !== "ready" ? (
        <Image
          src="/utopia-live2d/poster.webp"
          alt=""
          fill
          priority
          sizes="(min-width: 640px) 28rem, 100vw"
          className="pointer-events-none select-none object-contain"
        />
      ) : null}
      <div ref={containerRef} className="absolute inset-0" />
      {status === "unsupported" ? (
        <p className="absolute inset-x-0 bottom-0 text-center text-sm text-muted-foreground">
          このブラウザでは動かせないため、静止画で表示しています
        </p>
      ) : null}
    </div>
  );
}

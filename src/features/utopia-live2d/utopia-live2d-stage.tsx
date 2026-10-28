"use client";

import Image from "next/image";
import { type RefObject, useEffect, useRef, useState } from "react";
import { loadCubismCore } from "@/features/utopia-live2d/load-cubism-core";

const MODEL_URL = "/utopia-live2d/utopia.model3.json";
/** 頭を撫でたと見なす範囲（モデルの高さに対する上からの割合） */
const HEAD_PAT_RATIO = 0.3;
const REACTION_MILLISECONDS = 2200;
/**
 * カーソルを追うときの動き。エンジン任せ（autoFocus）だと首が ±30 度・体まで向いて大げさなので、
 * 目線を主にして首は少しだけ向ける。値はパラメータに足す量（目は -1〜1、角度は度）
 */
const GAZE = { eye: 0.8, angleX: 8, angleY: 6, smoothing: 0.08 } as const;

type StageStatus = "loading" | "ready" | "unsupported";

/** 表示中のモデルへの操作。表情の切り替えなどはページ側から呼ぶ */
export type Live2DStageHandle = {
  setExpression: (name: string | null) => void;
  /** うなずく（Nod）・首を振る（Shake）など、モデルのモーションを 1 回再生する */
  playMotion: (group: "Nod" | "Shake") => void;
};

export function UtopiaLive2DStage({
  handleRef,
  voiceLevelRef,
  followCursorRef,
  reactionExpression,
}: {
  handleRef: RefObject<Live2DStageHandle | null>;
  voiceLevelRef: RefObject<number>;
  /** true の間だけカーソルを目で追う。毎フレーム読むので ref で渡す */
  followCursorRef: RefObject<boolean>;
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
      const model = await Live2DModel.from(MODEL_URL, { autoFocus: false, autoHitTest: false });
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
      const parameterIndex = new Map<string, number>();
      for (let index = 0; index < coreModel.getParameterCount(); index++) {
        parameterIndex.set(coreModel.getParameterId(index).getString().s, index);
      }
      const mouthIndex = parameterIndex.get("ParamMouthOpenY") ?? -1;
      function addToParameter({ id, value }: { id: string; value: number }) {
        const index = parameterIndex.get(id);
        if (index !== undefined) {
          coreModel.setParameterValueByIndex(
            index,
            coreModel.getParameterValueByIndex(index) + value,
          );
        }
      }

      // カーソルの位置（モデルの中心から見た向き、-1〜1）。追わないときは正面へゆっくり戻す
      const gazeTarget = { x: 0, y: 0 };
      const gaze = { x: 0, y: 0 };
      function handlePointerMove(event: PointerEvent) {
        const bounds = app.canvas.getBoundingClientRect();
        const centerX = bounds.left + bounds.width / 2;
        const centerY = bounds.top + bounds.height * 0.3;
        gazeTarget.x = Math.max(-1, Math.min(1, (event.clientX - centerX) / bounds.width));
        gazeTarget.y = Math.max(-1, Math.min(1, (centerY - event.clientY) / bounds.height));
      }
      window.addEventListener("pointermove", handlePointerMove);

      model.internalModel.on("beforeModelUpdate", () => {
        const level = voiceLevelRef.current;
        if (mouthIndex >= 0 && level > 0) {
          const current = coreModel.getParameterValueByIndex(mouthIndex);
          coreModel.setParameterValueByIndex(mouthIndex, Math.max(current, level));
        }
        const follow = followCursorRef.current;
        gaze.x += ((follow ? gazeTarget.x : 0) - gaze.x) * GAZE.smoothing;
        gaze.y += ((follow ? gazeTarget.y : 0) - gaze.y) * GAZE.smoothing;
        addToParameter({ id: "ParamEyeBallX", value: gaze.x * GAZE.eye });
        addToParameter({ id: "ParamEyeBallY", value: gaze.y * GAZE.eye });
        addToParameter({ id: "ParamAngleX", value: gaze.x * GAZE.angleX });
        addToParameter({ id: "ParamAngleY", value: gaze.y * GAZE.angleY });
      });

      let currentExpression: string | null = null;
      let reactionTimer = 0;
      function applyExpression(name: string | null) {
        if (name) {
          void model.expression(name);
          return;
        }
        const manager = model.internalModel.motionManager.expressionManager as
          | (NonNullable<typeof model.internalModel.motionManager.expressionManager> & {
              currentExpression: unknown;
              defaultExpression: unknown;
              reserveExpressionIndex: number;
            })
          | undefined;
        if (!manager) {
          return;
        }
        // エンジンの resetExpression は「今の表情」と読み込み中の予約を更新しない。そのままだと
        // 通常に戻したあと同じ表情を選んでも「適用中」として無視され、読み込み中だった表情が後から上書きする
        manager.currentExpression = manager.defaultExpression;
        manager.reserveExpressionIndex = -1;
        manager.resetExpression();
      }
      handleRef.current = {
        setExpression(name) {
          currentExpression = name;
          window.clearTimeout(reactionTimer);
          applyExpression(name);
        },
        playMotion(group) {
          void model.motion(group);
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
        window.removeEventListener("pointermove", handlePointerMove);
        handleRef.current = null;
        app.destroy(true, { children: true });
      };
    }

    start(container).catch(() => setStatus("unsupported"));
    return () => {
      disposed = true;
      cleanup();
    };
  }, [handleRef, voiceLevelRef, followCursorRef]);

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

import type {
  InferenceWorkerCommand,
  WorkerModelConfig,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import {
  generateText,
  interruptTextGeneration,
  loadTextModel,
  resetTextGenerationState,
  resetTextPipeline,
  unloadTextPipeline,
} from "@/features/local-llm/inference-worker/text-pipeline";
import {
  generateVision,
  interruptVisionGeneration,
  loadVisionModel,
  resetVisionGenerationState,
  resetVisionPipeline,
  unloadVisionPipeline,
} from "@/features/local-llm/inference-worker/vision-pipeline";

let activeModelConfig: WorkerModelConfig | undefined;

function postMessage(event: Record<string, unknown>) {
  self.postMessage(event);
}

async function checkWebGpu() {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    if (!gpu) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }

    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      throw new Error("WebGPU is not supported (no adapter found)");
    }
  } catch (error) {
    postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadModel({ modelConfig }: { modelConfig: WorkerModelConfig }) {
  unloadTextPipeline();
  unloadVisionPipeline();
  activeModelConfig = modelConfig;

  postMessage({
    status: "loading",
    data: "モデルを読み込んでいます…",
  });

  const progressCallback = (event: Record<string, unknown>) => {
    postMessage(event);
  };

  postMessage({
    status: "loading",
    data: "シェーダーをコンパイルしてウォームアップしています…",
  });

  const loadedModelId =
    modelConfig.kind === "causal-lm"
      ? await loadTextModel({ modelConfig, progressCallback })
      : await loadVisionModel({ modelConfig, progressCallback });

  postMessage({ status: "ready", modelId: loadedModelId });
}

self.addEventListener("message", async (event: MessageEvent<InferenceWorkerCommand>) => {
  const command = event.data;

  try {
    switch (command.type) {
      case "check":
        await checkWebGpu();
        break;

      case "load":
        await loadModel({ modelConfig: command.model });
        break;

      case "generate": {
        if (!activeModelConfig) {
          throw new Error("Model is not loaded");
        }

        if (activeModelConfig.kind === "causal-lm") {
          resetTextGenerationState();
          await generateText({ messages: command.data });
          break;
        }

        resetVisionGenerationState();
        await generateVision({
          messages: command.data,
          kind: activeModelConfig.kind,
        });
        break;
      }

      case "interrupt":
        if (activeModelConfig?.kind === "causal-lm") {
          interruptTextGeneration();
        } else {
          interruptVisionGeneration();
        }
        break;

      case "reset":
        resetTextPipeline();
        resetVisionPipeline();
        break;
    }
  } catch (error) {
    postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
});

import type {
  InferenceWorkerCommand,
  InferenceWorkerEvent,
  InferenceWorkerEventSender,
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function checkWebGpu() {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
  if (!gpu) {
    throw new Error("WebGPU is not supported (no adapter found)");
  }

  const adapter = await gpu.requestAdapter();
  if (!adapter) {
    throw new Error("WebGPU is not supported (no adapter found)");
  }
}

async function loadModel({
  modelConfig,
  postEvent,
}: {
  modelConfig: WorkerModelConfig;
  postEvent: InferenceWorkerEventSender;
}) {
  unloadTextPipeline();
  unloadVisionPipeline();

  postEvent({
    status: "loading",
    data: "モデルを読み込んでいます…",
  });

  const progressCallback = (event: Record<string, unknown>) => {
    postEvent(event as InferenceWorkerEvent);
  };

  postEvent({
    status: "loading",
    data: "シェーダーをコンパイルしてウォームアップしています…",
  });

  const loadedModelId =
    modelConfig.kind === "causal-lm"
      ? await loadTextModel({ modelConfig, progressCallback })
      : await loadVisionModel({ modelConfig, progressCallback });

  postEvent({ status: "ready", modelId: loadedModelId });
}

export function createInferenceSession({ postEvent }: { postEvent: InferenceWorkerEventSender }) {
  let activeModelConfig: WorkerModelConfig | undefined;

  async function handleCommand(command: InferenceWorkerCommand) {
    try {
      switch (command.type) {
        case "check":
          await checkWebGpu();
          break;

        case "load":
          activeModelConfig = command.model;
          await loadModel({ modelConfig: command.model, postEvent });
          break;

        case "generate": {
          if (!activeModelConfig) {
            throw new Error("Model is not loaded");
          }

          if (activeModelConfig.kind === "causal-lm") {
            resetTextGenerationState();
            await generateText({ messages: command.data, postEvent });
            break;
          }

          resetVisionGenerationState();
          await generateVision({
            messages: command.data,
            kind: activeModelConfig.kind,
            postEvent,
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
      postEvent({
        status: "error",
        data: getErrorMessage(error),
      });
    }
  }

  function dispose() {
    unloadTextPipeline();
    unloadVisionPipeline();
    activeModelConfig = undefined;
  }

  return {
    dispose,
    handleCommand,
  };
}

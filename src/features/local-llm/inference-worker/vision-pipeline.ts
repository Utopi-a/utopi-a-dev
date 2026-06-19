import {
  AutoImageProcessor,
  AutoProcessor,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  LlavaProcessor,
  Moondream1ForConditionalGeneration,
  Qwen3VLForConditionalGeneration,
  RawImage,
  TextStreamer,
} from "@huggingface/transformers";
import type {
  InferenceMessage,
  InferenceWorkerEventSender,
  WorkerModelConfig,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import type { LocalLlmModelKind } from "@/features/local-llm/model-registry/local-llm-models";

type VisionKind = Extract<LocalLlmModelKind, "moondream" | "qwen3-vl">;

type LoadedVisionPipeline =
  | {
      kind: "moondream";
      modelId: string;
      processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
      tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>;
      model: Awaited<ReturnType<typeof Moondream1ForConditionalGeneration.from_pretrained>>;
    }
  | {
      kind: "qwen3-vl";
      modelId: string;
      processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
      model: Awaited<ReturnType<typeof Qwen3VLForConditionalGeneration.from_pretrained>>;
    };

let loadedPipeline: LoadedVisionPipeline | undefined;
const stoppingCriteria = new InterruptableStoppingCriteria();

async function loadImageFromDataUrl({ dataUrl }: { dataUrl: string }) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return RawImage.fromBlob(blob);
}

function buildMoondreamPrompt({ question }: { question: string }) {
  return `<image>\n\nQuestion: ${question}\n\nAnswer:`;
}

async function createMoondreamProcessor({
  modelId,
  progressCallback,
}: {
  modelId: string;
  progressCallback?: (event: Record<string, unknown>) => void;
}) {
  const processorOptions = { progress_callback: progressCallback };
  const [imageProcessor, tokenizer] = await Promise.all([
    AutoImageProcessor.from_pretrained(modelId, processorOptions),
    AutoTokenizer.from_pretrained(modelId, processorOptions),
  ]);

  // Xenova/moondream2 has no processor_config.json; AutoProcessor only runs the image path.
  // LlavaProcessor expands <image> placeholders to match vision encoder patch features.
  const processor = new LlavaProcessor(
    {
      image_token: "<image>",
      patch_size: 14,
      num_additional_image_tokens: 0,
    },
    { image_processor: imageProcessor, tokenizer },
    "",
  );

  return { processor, tokenizer };
}

function getLatestUserTurn({ messages }: { messages: InferenceMessage[] }) {
  const lastUserIndex = messages.findLastIndex((message) => message.role === "user");
  if (lastUserIndex === -1) {
    throw new Error("User message is required");
  }

  return {
    message: messages[lastUserIndex],
    history: messages.slice(0, lastUserIndex),
  };
}

export async function loadVisionModel({
  modelConfig,
  progressCallback,
}: {
  modelConfig: WorkerModelConfig;
  progressCallback?: (event: Record<string, unknown>) => void;
}) {
  if (loadedPipeline?.modelId === modelConfig.huggingFaceModelId) {
    return modelConfig.huggingFaceModelId;
  }

  unloadVisionPipeline();

  if (modelConfig.kind === "moondream") {
    const { processor, tokenizer } = await createMoondreamProcessor({
      modelId: modelConfig.huggingFaceModelId,
      progressCallback,
    });
    const model = await Moondream1ForConditionalGeneration.from_pretrained(
      modelConfig.huggingFaceModelId,
      {
        dtype: modelConfig.dtype as {
          embed_tokens: "fp16";
          vision_encoder: "fp16";
          decoder_model_merged: "q4";
        },
        device: "webgpu",
        progress_callback: progressCallback,
      },
    );

    const image = await loadImageFromDataUrl({
      dataUrl:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    });
    const warmupInputs = await processor(image, buildMoondreamPrompt({ question: "warmup" }));
    await model.generate({ ...warmupInputs, max_new_tokens: 1 });

    loadedPipeline = {
      kind: "moondream",
      modelId: modelConfig.huggingFaceModelId,
      processor,
      tokenizer,
      model,
    };
    return modelConfig.huggingFaceModelId;
  }

  const processor = await AutoProcessor.from_pretrained(modelConfig.huggingFaceModelId, {
    progress_callback: progressCallback,
  });
  const model = await Qwen3VLForConditionalGeneration.from_pretrained(
    modelConfig.huggingFaceModelId,
    {
      dtype: modelConfig.dtype as {
        embed_tokens: "fp16";
        vision_encoder: "fp16";
        decoder_model_merged: "q4f16";
      },
      device: "webgpu",
      progress_callback: progressCallback,
    },
  );

  const image = await loadImageFromDataUrl({
    dataUrl:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  });
  const warmupInputs = (await processor.apply_chat_template(
    [
      {
        role: "user",
        content: [{ type: "image" }, { type: "text", text: "warmup" }],
      },
    ],
    {
      add_generation_prompt: true,
      return_dict: true,
      images: [image],
    } as Record<string, unknown>,
  )) as Record<string, unknown>;
  await model.generate({ ...warmupInputs, max_new_tokens: 1 });

  loadedPipeline = {
    kind: "qwen3-vl",
    modelId: modelConfig.huggingFaceModelId,
    processor,
    model,
  };

  return modelConfig.huggingFaceModelId;
}

async function generateMoondream({
  messages,
  postEvent,
}: {
  messages: InferenceMessage[];
  postEvent: InferenceWorkerEventSender;
}) {
  if (loadedPipeline?.kind !== "moondream") {
    throw new Error("Moondream model is not loaded");
  }

  const { message } = getLatestUserTurn({ messages });
  const messageIndex = messages.lastIndexOf(message);
  const imageAttachment =
    message.images?.[0] ??
    messages
      .slice(0, messageIndex)
      .reverse()
      .flatMap((entry) => entry.images ?? [])
      .at(0);
  if (!imageAttachment) {
    throw new Error("Moondream requires an image attachment");
  }

  const image = await loadImageFromDataUrl({ dataUrl: imageAttachment.dataUrl });
  const inputs = await loadedPipeline.processor(
    image,
    buildMoondreamPrompt({ question: message.content }),
  );

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | null = null;

  const streamer = new TextStreamer(loadedPipeline.tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (output: string) => {
      postEvent({ status: "update", output, tps, numTokens });
    },
    token_callback_function: () => {
      startTime ??= performance.now();
      if (numTokens++ > 0 && startTime !== undefined) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    },
  });

  postEvent({ status: "start" });

  await loadedPipeline.model.generate({
    ...inputs,
    do_sample: false,
    max_new_tokens: 512,
    streamer,
    stopping_criteria: stoppingCriteria,
  });

  postEvent({ status: "complete" });
}

async function generateQwen3Vl({
  messages,
  postEvent,
}: {
  messages: InferenceMessage[];
  postEvent: InferenceWorkerEventSender;
}) {
  if (loadedPipeline?.kind !== "qwen3-vl") {
    throw new Error("Qwen3-VL model is not loaded");
  }

  const images: Awaited<ReturnType<typeof loadImageFromDataUrl>>[] = [];
  const chatMessages = await Promise.all(
    messages.map(async (message) => {
      if (message.role !== "user" || !message.images?.length) {
        return { role: message.role, content: message.content };
      }

      const loadedImages = await Promise.all(
        message.images.map((image) => loadImageFromDataUrl({ dataUrl: image.dataUrl })),
      );
      images.push(...loadedImages);

      return {
        role: message.role,
        content: [
          ...message.images.map(() => ({ type: "image" as const })),
          { type: "text" as const, text: message.content },
        ],
      };
    }),
  );

  const tokenizer = loadedPipeline.processor.tokenizer;
  if (!tokenizer) {
    throw new Error("Tokenizer is not available");
  }

  const inputs = (await loadedPipeline.processor.apply_chat_template(chatMessages, {
    add_generation_prompt: true,
    return_dict: true,
    images,
  } as Record<string, unknown>)) as Record<string, unknown>;

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | null = null;

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (output: string) => {
      postEvent({ status: "update", output, tps, numTokens });
    },
    token_callback_function: () => {
      startTime ??= performance.now();
      if (numTokens++ > 0 && startTime !== undefined) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    },
  });

  postEvent({ status: "start" });

  await loadedPipeline.model.generate({
    ...inputs,
    max_new_tokens: 512,
    streamer,
    stopping_criteria: stoppingCriteria,
  } as Record<string, unknown>);

  postEvent({ status: "complete" });
}

export async function generateVision({
  messages,
  kind,
  postEvent,
}: {
  messages: InferenceMessage[];
  kind: VisionKind;
  postEvent: InferenceWorkerEventSender;
}) {
  if (kind === "moondream") {
    await generateMoondream({ messages, postEvent });
    return;
  }

  await generateQwen3Vl({ messages, postEvent });
}

export function resetVisionGenerationState() {
  stoppingCriteria.reset();
}

export function resetVisionPipeline() {
  stoppingCriteria.reset();
}

export function interruptVisionGeneration() {
  stoppingCriteria.interrupt();
}

export function unloadVisionPipeline() {
  loadedPipeline = undefined;
  stoppingCriteria.reset();
}

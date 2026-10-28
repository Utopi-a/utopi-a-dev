import {
  AutoImageProcessor,
  AutoProcessor,
  AutoTokenizer,
  InterruptableStoppingCriteria,
  Lfm3VlForConditionalGeneration,
  LlavaProcessor,
  Moondream1ForConditionalGeneration,
  Qwen3VLForConditionalGeneration,
  RawImage,
  TextStreamer,
} from "@huggingface/transformers";
import type {
  InferenceMessage,
  InferenceTool,
  InferenceWorkerEventSender,
  WorkerModelConfig,
} from "@/features/local-llm/inference-worker/inference-worker-messages";
import type { LocalLlmModelKind } from "@/features/local-llm/model-registry/local-llm-models";

type VisionKind = Extract<LocalLlmModelKind, "moondream" | "qwen3-vl" | "lfm3-vl">;

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
    }
  | {
      kind: "lfm3-vl";
      modelId: string;
      processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>>;
      model: Awaited<ReturnType<typeof Lfm3VlForConditionalGeneration.from_pretrained>>;
    };

let loadedPipeline: LoadedVisionPipeline | undefined;

const WARMUP_IMAGE_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

// LFM3-VL の既定上限（約 1,600 万画素）だとスマホ写真 1 枚で画像トークンが 1 万を超えるため、1024 トークン相当に抑える
const LFM3_VL_MAX_PIXELS = 1024 * 32 * 32;
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

async function buildChatMessagesWithImages({ messages }: { messages: InferenceMessage[] }) {
  const images: Awaited<ReturnType<typeof loadImageFromDataUrl>>[] = [];
  const chatMessages = await Promise.all(
    messages.map(async (message) => {
      if (message.role === "tool") {
        return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
      }
      if (message.toolCalls?.length) {
        // LFM3 のテンプレートは arguments をオブジェクトで受け取る（JSON 文字列だと例外になる）
        return {
          role: message.role,
          content: message.content,
          tool_calls: message.toolCalls.map(({ id, name, arguments: args }) => ({
            id,
            type: "function",
            function: { name, arguments: args },
          })),
        };
      }
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

  return { chatMessages, images };
}

export async function loadVisionModel({
  modelConfig,
  progressCallback,
  onWarmup,
}: {
  modelConfig: WorkerModelConfig;
  progressCallback?: (event: Record<string, unknown>) => void;
  onWarmup: () => void;
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

    onWarmup();
    const image = await loadImageFromDataUrl({ dataUrl: WARMUP_IMAGE_DATA_URL });
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

  if (modelConfig.kind === "lfm3-vl") {
    const processor = await AutoProcessor.from_pretrained(modelConfig.huggingFaceModelId, {
      progress_callback: progressCallback,
    });
    (processor.image_processor as { max_pixels: number }).max_pixels = LFM3_VL_MAX_PIXELS;
    const model = await Lfm3VlForConditionalGeneration.from_pretrained(
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

    onWarmup();
    const image = await loadImageFromDataUrl({ dataUrl: WARMUP_IMAGE_DATA_URL });
    const warmupPrompt = processor.apply_chat_template(
      [{ role: "user", content: [{ type: "image" }, { type: "text", text: "warmup" }] }],
      { add_generation_prompt: true, tokenize: false, enable_thinking: false } as Record<
        string,
        unknown
      >,
    ) as string;
    const warmupInputs = await processor(image, warmupPrompt, { add_special_tokens: false });
    await model.generate({ ...warmupInputs, max_new_tokens: 1 });

    loadedPipeline = {
      kind: "lfm3-vl",
      modelId: modelConfig.huggingFaceModelId,
      processor,
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

  onWarmup();
  const image = await loadImageFromDataUrl({ dataUrl: WARMUP_IMAGE_DATA_URL });
  // Processor.apply_chat_template は画像を処理せず文字列を返すだけなので、画像は processor 本体に渡す
  const warmupPrompt = processor.apply_chat_template(
    [{ role: "user", content: [{ type: "image" }, { type: "text", text: "warmup" }] }],
    { add_generation_prompt: true, tokenize: false } as Record<string, unknown>,
  ) as string;
  const warmupInputs = await processor(warmupPrompt, [image]);
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

  const { chatMessages, images } = await buildChatMessagesWithImages({ messages });

  const tokenizer = loadedPipeline.processor.tokenizer;
  if (!tokenizer) {
    throw new Error("Tokenizer is not available");
  }

  const prompt = loadedPipeline.processor.apply_chat_template(chatMessages, {
    add_generation_prompt: true,
    tokenize: false,
  } as Record<string, unknown>) as string;
  const inputs = await loadedPipeline.processor(prompt, images.length > 0 ? images : null);

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

async function generateLfm3Vl({
  messages,
  tools,
  postEvent,
}: {
  messages: InferenceMessage[];
  tools?: InferenceTool[];
  postEvent: InferenceWorkerEventSender;
}) {
  if (loadedPipeline?.kind !== "lfm3-vl") {
    throw new Error("LFM3-VL model is not loaded");
  }

  const { chatMessages, images } = await buildChatMessagesWithImages({ messages });

  const tokenizer = loadedPipeline.processor.tokenizer;
  if (!tokenizer) {
    throw new Error("Tokenizer is not available");
  }

  // Lfm3VlProcessor は画像トークンを画像ごとのパッチ数に展開するため、テンプレートは文字列で受け取ってから渡す
  // ツールは system の末尾に <tools> として入り、呼び出しは <tool_call><function=…> の形で返る
  const prompt = loadedPipeline.processor.apply_chat_template(chatMessages, {
    add_generation_prompt: true,
    tokenize: false,
    enable_thinking: false,
    tools: tools?.length ? tools : undefined,
  } as Record<string, unknown>) as string;
  const inputs = await loadedPipeline.processor(images.length > 0 ? images : null, prompt, {
    add_special_tokens: false,
  });

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
    do_sample: true,
    temperature: 0.1,
    top_k: 50,
    repetition_penalty: 1.1,
    max_new_tokens: 512,
    streamer,
    stopping_criteria: stoppingCriteria,
  });

  postEvent({ status: "complete" });
}

export async function generateVision({
  messages,
  kind,
  tools,
  postEvent,
}: {
  messages: InferenceMessage[];
  kind: VisionKind;
  tools?: InferenceTool[];
  postEvent: InferenceWorkerEventSender;
}) {
  if (kind === "moondream") {
    await generateMoondream({ messages, postEvent });
    return;
  }

  if (kind === "lfm3-vl") {
    await generateLfm3Vl({ messages, tools, postEvent });
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

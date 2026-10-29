import {
  AutoModelForCausalLM,
  AutoTokenizer,
  type DynamicCache,
  InterruptableStoppingCriteria,
  TextStreamer,
} from "@huggingface/transformers";
import { toChatTemplateMessage } from "@/features/local-llm/inference-worker/chat-template-message";
import type {
  InferenceMessage,
  InferenceTool,
  InferenceWorkerEventSender,
  WorkerModelConfig,
} from "@/features/local-llm/inference-worker/inference-worker-messages";

let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | undefined;
let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>> | undefined;
let loadedModelId: string | undefined;

const stoppingCriteria = new InterruptableStoppingCriteria();
let pastKeyValuesCache: DynamicCache | null = null;

export async function loadTextModel({
  modelConfig,
  progressCallback,
  onWarmup,
}: {
  modelConfig: WorkerModelConfig;
  progressCallback?: (event: Record<string, unknown>) => void;
  onWarmup: () => void;
}) {
  if (loadedModelId !== modelConfig.huggingFaceModelId) {
    tokenizer = undefined;
    model = undefined;
    pastKeyValuesCache = null;
    loadedModelId = modelConfig.huggingFaceModelId;
  }

  tokenizer ??= await AutoTokenizer.from_pretrained(modelConfig.huggingFaceModelId, {
    progress_callback: progressCallback,
  });

  model ??= await AutoModelForCausalLM.from_pretrained(modelConfig.huggingFaceModelId, {
    dtype: modelConfig.dtype as "q4",
    device: "webgpu",
    progress_callback: progressCallback,
  });

  onWarmup();
  const inputs = tokenizer("a");
  await model.generate({ ...inputs, max_new_tokens: 1 });

  return modelConfig.huggingFaceModelId;
}

export async function generateText({
  messages,
  tools,
  generation,
  postEvent,
}: {
  messages: InferenceMessage[];
  tools?: InferenceTool[];
  generation?: { thinking: boolean };
  postEvent: InferenceWorkerEventSender;
}) {
  if (!tokenizer || !model) {
    throw new Error("Text model is not loaded");
  }

  const chatMessages = messages.map((message) => toChatTemplateMessage({ message }));

  // LFM3 のテンプレートは思考モードが既定で有効。チャット欄に推論過程を流さないため切る（他モデルのテンプレートは無視する）。
  // apply_chat_template は未知のキーをテンプレート変数として渡すが、型には載っていないので変数経由で渡す
  const templateOptions = {
    add_generation_prompt: true,
    return_dict: true,
    enable_thinking: generation?.thinking ?? false,
    tools: tools?.length ? tools : undefined,
  };
  const inputs = tokenizer.apply_chat_template(chatMessages, templateOptions);

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

  const result = await model.generate({
    ...inputs,
    past_key_values: pastKeyValuesCache,
    do_sample: true,
    temperature: 0.1,
    // エージェントは LFM3 の推奨値で生成する。思考を書くぶん長く取る
    ...(generation
      ? { top_k: 50, repetition_penalty: 1.1, max_new_tokens: generation.thinking ? 1024 : 384 }
      : { repetition_penalty: 1.05, max_new_tokens: 512 }),
    streamer,
    stopping_criteria: stoppingCriteria,
    return_dict_in_generate: true,
  });

  if (typeof result === "object" && result !== null && "past_key_values" in result) {
    pastKeyValuesCache = result.past_key_values as DynamicCache;
  }

  postEvent({ status: "complete" });
}

export function resetTextGenerationState() {
  stoppingCriteria.reset();
}

export function resetTextPipeline() {
  pastKeyValuesCache = null;
  stoppingCriteria.reset();
}

export function interruptTextGeneration() {
  stoppingCriteria.interrupt();
}

export function unloadTextPipeline() {
  tokenizer = undefined;
  model = undefined;
  loadedModelId = undefined;
  pastKeyValuesCache = null;
  stoppingCriteria.reset();
}

import {
  AutoModelForCausalLM,
  AutoTokenizer,
  type DynamicCache,
  InterruptableStoppingCriteria,
  TextStreamer,
} from "@huggingface/transformers";
import type {
  InferenceMessage,
  WorkerModelConfig,
} from "@/features/local-llm/inference-worker/inference-worker-messages";

let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | undefined;
let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>> | undefined;
let loadedModelId: string | undefined;

const stoppingCriteria = new InterruptableStoppingCriteria();
let pastKeyValuesCache: DynamicCache | null = null;

function postMessage(event: Record<string, unknown>) {
  self.postMessage(event);
}

export async function loadTextModel({
  modelConfig,
  progressCallback,
}: {
  modelConfig: WorkerModelConfig;
  progressCallback?: (event: Record<string, unknown>) => void;
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

  const inputs = tokenizer("a");
  await model.generate({ ...inputs, max_new_tokens: 1 });

  return modelConfig.huggingFaceModelId;
}

export async function generateText({ messages }: { messages: InferenceMessage[] }) {
  if (!tokenizer || !model) {
    throw new Error("Text model is not loaded");
  }

  const chatMessages = messages.map(({ role, content }) => ({ role, content }));

  const inputs = tokenizer.apply_chat_template(chatMessages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | null = null;

  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (output: string) => {
      postMessage({ status: "update", output, tps, numTokens });
    },
    token_callback_function: () => {
      startTime ??= performance.now();
      if (numTokens++ > 0 && startTime !== undefined) {
        tps = (numTokens / (performance.now() - startTime)) * 1000;
      }
    },
  });

  postMessage({ status: "start" });

  const result = await model.generate({
    ...inputs,
    past_key_values: pastKeyValuesCache,
    do_sample: true,
    temperature: 0.1,
    repetition_penalty: 1.05,
    max_new_tokens: 512,
    streamer,
    stopping_criteria: stoppingCriteria,
    return_dict_in_generate: true,
  });

  if (typeof result === "object" && result !== null && "past_key_values" in result) {
    pastKeyValuesCache = result.past_key_values as DynamicCache;
  }

  postMessage({ status: "complete" });
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

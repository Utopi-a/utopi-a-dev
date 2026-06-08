import {
  AutoModelForCausalLM,
  AutoTokenizer,
  type DynamicCache,
  InterruptableStoppingCriteria,
  TextStreamer,
} from "@huggingface/transformers";
import type {
  LfmInferenceMessage,
  LfmWorkerCommand,
} from "@/features/local-llm/lfm-inference-worker/lfm-worker-messages";
import { LFM_JP_MODEL_ID } from "@/features/local-llm/lfm-model-config/lfm-model-config";

let tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>> | undefined;
let model: Awaited<ReturnType<typeof AutoModelForCausalLM.from_pretrained>> | undefined;

async function getTextGenerationPipeline({
  progressCallback,
}: {
  progressCallback?: (event: Record<string, unknown>) => void;
}) {
  tokenizer ??= await AutoTokenizer.from_pretrained(LFM_JP_MODEL_ID, {
    progress_callback: progressCallback,
  });

  model ??= await AutoModelForCausalLM.from_pretrained(LFM_JP_MODEL_ID, {
    dtype: "q4",
    device: "webgpu",
    progress_callback: progressCallback,
  });

  return [tokenizer, model] as const;
}

const stoppingCriteria = new InterruptableStoppingCriteria();
let pastKeyValuesCache: DynamicCache | null = null;

async function generate({ messages }: { messages: LfmInferenceMessage[] }) {
  const [loadedTokenizer, loadedModel] = await getTextGenerationPipeline({});

  const inputs = loadedTokenizer.apply_chat_template(messages, {
    add_generation_prompt: true,
    return_dict: true,
  });

  let startTime: number | undefined;
  let numTokens = 0;
  let tps: number | null = null;

  const tokenCallbackFunction = () => {
    startTime ??= performance.now();

    if (numTokens++ > 0 && startTime !== undefined) {
      tps = (numTokens / (performance.now() - startTime)) * 1000;
    }
  };

  const callbackFunction = (output: string) => {
    self.postMessage({
      status: "update",
      output,
      tps,
      numTokens,
    });
  };

  const streamer = new TextStreamer(loadedTokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: callbackFunction,
    token_callback_function: tokenCallbackFunction,
  });

  self.postMessage({ status: "start" });

  const result = await loadedModel.generate({
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

  self.postMessage({ status: "complete" });
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
    self.postMessage({
      status: "error",
      data: error instanceof Error ? error.message : String(error),
    });
  }
}

async function loadModel() {
  self.postMessage({
    status: "loading",
    data: "モデルを読み込んでいます…",
  });

  const [loadedTokenizer, loadedModel] = await getTextGenerationPipeline({
    progressCallback: (event) => {
      self.postMessage(event);
    },
  });

  self.postMessage({
    status: "loading",
    data: "シェーダーをコンパイルしてウォームアップしています…",
  });

  const inputs = loadedTokenizer("a");
  await loadedModel.generate({ ...inputs, max_new_tokens: 1 });

  self.postMessage({ status: "ready" });
}

self.addEventListener("message", async (event: MessageEvent<LfmWorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case "check":
      await checkWebGpu();
      break;

    case "load":
      await loadModel();
      break;

    case "generate":
      stoppingCriteria.reset();
      await generate({ messages: command.data });
      break;

    case "interrupt":
      stoppingCriteria.interrupt();
      break;

    case "reset":
      pastKeyValuesCache = null;
      stoppingCriteria.reset();
      break;
  }
});

import { createInferenceSession } from "@/features/local-llm/inference-worker/inference-session";
import type { InferenceWorkerCommand } from "@/features/local-llm/inference-worker/inference-worker-messages";

const session = createInferenceSession({
  postEvent(event) {
    self.postMessage(event);
  },
});

self.addEventListener("message", async (event: MessageEvent<InferenceWorkerCommand>) => {
  await session.handleCommand(event.data);
});

import { createInferenceSession } from "@/features/local-llm/inference-worker/inference-session";
import type {
  InferenceWorkerCommand,
  InferenceWorkerEvent,
} from "@/features/local-llm/inference-worker/inference-worker-messages";

export type BrowserInferenceClient = {
  postMessage: (command: InferenceWorkerCommand) => void;
  terminate: () => void;
};

type BrowserInferenceClientOptions = {
  onError: (event: ErrorEvent) => void;
  onMessage: (event: MessageEvent<InferenceWorkerEvent>) => void;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function createBrowserInferenceClient({
  onError,
  onMessage,
}: BrowserInferenceClientOptions): BrowserInferenceClient {
  let isTerminated = false;
  let commandQueue = Promise.resolve();

  const session = createInferenceSession({
    postEvent(event) {
      if (isTerminated) {
        return;
      }

      onMessage(new MessageEvent("message", { data: event }));
    },
  });

  async function runCommand(command: InferenceWorkerCommand) {
    if (isTerminated) {
      return;
    }

    try {
      await session.handleCommand(command);
    } catch (error) {
      if (!isTerminated) {
        onError(new ErrorEvent("error", { message: getErrorMessage(error) }));
      }
    }
  }

  return {
    postMessage(command) {
      if (isTerminated) {
        return;
      }

      if (command.type === "interrupt" || command.type === "reset") {
        void runCommand(command);
        return;
      }

      commandQueue = commandQueue.then(() => runCommand(command));
    },
    terminate() {
      isTerminated = true;
      session.dispose();
    },
  };
}

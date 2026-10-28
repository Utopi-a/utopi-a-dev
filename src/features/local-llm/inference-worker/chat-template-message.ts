import type { InferenceMessage } from "@/features/local-llm/inference-worker/inference-worker-messages";

/**
 * 画像・音声を含まない 1 件を、LFM3 のチャットテンプレートが読む形にする。
 * ツールの呼び出しは tool_calls、その結果は role "tool" で渡す。
 */
export function toChatTemplateMessage({ message }: { message: InferenceMessage }) {
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
  return { role: message.role, content: message.content };
}

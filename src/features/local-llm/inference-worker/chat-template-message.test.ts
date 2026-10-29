import { describe, expect, it } from "vitest";
import { toChatTemplateMessage } from "@/features/local-llm/inference-worker/chat-template-message";

describe("toChatTemplateMessage", () => {
  it("ツールの呼び出しは引数をオブジェクトのまま tool_calls にし、結果は role tool で渡す", () => {
    expect(
      toChatTemplateMessage({
        message: {
          role: "assistant",
          content: "",
          toolCalls: [{ id: "c0", name: "search_wikipedia", arguments: { query: "富士山" } }],
        },
      }),
    ).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "c0",
          type: "function",
          function: { name: "search_wikipedia", arguments: { query: "富士山" } },
        },
      ],
    });
    expect(
      toChatTemplateMessage({ message: { role: "tool", toolCallId: "c0", content: "結果" } }),
    ).toEqual({ role: "tool", tool_call_id: "c0", content: "結果" });
  });

  it("ふつうの発言は role と content だけにする", () => {
    expect(toChatTemplateMessage({ message: { role: "user", content: "やあ" } })).toEqual({
      role: "user",
      content: "やあ",
    });
  });
});

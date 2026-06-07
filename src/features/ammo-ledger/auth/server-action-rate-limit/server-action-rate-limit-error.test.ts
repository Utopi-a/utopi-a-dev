import { describe, expect, it } from "vitest";
import {
  ServerActionRateLimitError,
  serverActionRateLimitErrorResult,
  serverActionRateLimitMessage,
} from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";

describe("ServerActionRateLimitError", () => {
  it("識別可能なエラー名を持つ", () => {
    const error = new ServerActionRateLimitError();

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("ServerActionRateLimitError");
    expect(error.message).toBe("SERVER_ACTION_RATE_LIMITED");
  });
});

describe("serverActionRateLimitErrorResult", () => {
  it("UI 向けのエラー結果を返す", () => {
    expect(serverActionRateLimitErrorResult()).toEqual({
      ok: false,
      error: serverActionRateLimitMessage,
    });
  });
});

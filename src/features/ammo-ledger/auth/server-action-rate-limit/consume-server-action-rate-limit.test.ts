import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { assertServerActionRateLimit } from "@/features/ammo-ledger/auth/server-action-rate-limit/consume-server-action-rate-limit";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";

describe("assertServerActionRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mutation は 30 回まで許可する", () => {
    for (let index = 0; index < 30; index += 1) {
      expect(() =>
        assertServerActionRateLimit({ userId: "user-max-30", kind: "mutation" }),
      ).not.toThrow();
    }
  });

  it("mutation は 31 回目で拒否する", () => {
    for (let index = 0; index < 30; index += 1) {
      assertServerActionRateLimit({ userId: "user-max-31", kind: "mutation" });
    }

    expect(() => assertServerActionRateLimit({ userId: "user-max-31", kind: "mutation" })).toThrow(
      ServerActionRateLimitError,
    );
  });

  it("ウィンドウ経過後は再度許可する", () => {
    for (let index = 0; index < 30; index += 1) {
      assertServerActionRateLimit({ userId: "user-window-reset", kind: "mutation" });
    }

    vi.advanceTimersByTime(60_001);

    expect(() =>
      assertServerActionRateLimit({ userId: "user-window-reset", kind: "mutation" }),
    ).not.toThrow();
  });

  it("ユーザーごとに独立してカウントする", () => {
    for (let index = 0; index < 30; index += 1) {
      assertServerActionRateLimit({ userId: "user-isolated-a", kind: "mutation" });
    }

    expect(() =>
      assertServerActionRateLimit({ userId: "user-isolated-b", kind: "mutation" }),
    ).not.toThrow();
  });

  it("read は 120 回まで許可する", () => {
    for (let index = 0; index < 120; index += 1) {
      expect(() =>
        assertServerActionRateLimit({ userId: "user-read-max", kind: "read" }),
      ).not.toThrow();
    }
  });

  it("read は 121 回目で拒否する", () => {
    for (let index = 0; index < 120; index += 1) {
      assertServerActionRateLimit({ userId: "user-read-over", kind: "read" });
    }

    expect(() => assertServerActionRateLimit({ userId: "user-read-over", kind: "read" })).toThrow(
      ServerActionRateLimitError,
    );
  });

  it("read と mutation は別バケットでカウントする", () => {
    for (let index = 0; index < 30; index += 1) {
      assertServerActionRateLimit({ userId: "user-mixed", kind: "mutation" });
    }

    expect(() => assertServerActionRateLimit({ userId: "user-mixed", kind: "read" })).not.toThrow();
  });
});

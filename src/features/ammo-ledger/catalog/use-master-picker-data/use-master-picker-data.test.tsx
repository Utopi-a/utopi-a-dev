import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMasterPickerData } from "./use-master-picker-data";

function IsolatedSwr({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), shouldRetryOnError: false }}>
      {children}
    </SWRConfig>
  );
}

function renderPickerData() {
  return renderHook(() => useMasterPickerData({ catalogKind: "range", enabled: true }), {
    wrapper: IsolatedSwr,
  });
}

describe("useMasterPickerData", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("通信できないときはブラウザの英語ではなく日本語で知らせる", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderPickerData();

    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        "一覧を取得できませんでした。通信状態を確認して再試行してください。",
      ),
    );
  });

  it("読み込みのレート制限に当たったら、しばらく待つよう知らせる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      Response.json({ error: "rate limited" }, { status: 429 }),
    );

    const { result } = renderPickerData();

    await waitFor(() =>
      expect(result.current.error?.message).toBe(
        "操作が多すぎます。しばらくしてからお試しください。",
      ),
    );
  });
});

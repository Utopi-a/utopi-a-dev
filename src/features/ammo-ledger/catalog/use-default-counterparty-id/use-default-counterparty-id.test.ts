import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { useDefaultCounterpartyId } from "./use-default-counterparty-id";

const pickerData = {
  recent: [{ id: "recent-shop", name: "最近の店", address: "東京都" }],
  registered: [{ id: "registered-shop", name: "登録済みの店", address: "千葉県" }],
} as unknown as MasterPickerData;

type HookProps = { data?: MasterPickerData; error?: Error };

describe("useDefaultCounterpartyId", () => {
  it("一覧の到着前は手入力にせず未選択にし、届いたら最近使った相手方を既定値にする", () => {
    const { result, rerender } = renderHook(
      ({ data }: HookProps) =>
        useDefaultCounterpartyId({ pickerData: data, defaultsToRecent: true }),
      { initialProps: {} },
    );
    expect(result.current.counterpartyId).toBe("");

    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe("recent-shop");
  });

  it("最近の相手を既定にしない区分（譲渡・交付）では、一覧が届いても未選択のままにする", () => {
    const { result, rerender } = renderHook(
      ({ data }: HookProps) =>
        useDefaultCounterpartyId({ pickerData: data, defaultsToRecent: false }),
      { initialProps: {} },
    );

    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe("");
  });

  it("一覧を取得できなければ、入力を続けられるよう手入力にする", () => {
    const { result, rerender } = renderHook(
      ({ data, error }: HookProps) =>
        useDefaultCounterpartyId({ pickerData: data, pickerError: error, defaultsToRecent: false }),
      { initialProps: {} },
    );

    rerender({ error: new Error("一覧を取得できませんでした") });
    expect(result.current.counterpartyId).toBe(manualCounterpartyId);
  });

  it("編集中の記録の相手方を一覧の到着で上書きしない", () => {
    const { result, rerender } = renderHook(
      ({ data }: HookProps) =>
        useDefaultCounterpartyId({
          initialCounterpartyId: "saved-shop",
          pickerData: data,
          defaultsToRecent: true,
        }),
      { initialProps: {} },
    );

    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe("saved-shop");
  });

  it("一覧の到着前に利用者が選んだ相手方を上書きしない", () => {
    const { result, rerender } = renderHook(
      ({ data }: HookProps) =>
        useDefaultCounterpartyId({ pickerData: data, defaultsToRecent: true }),
      { initialProps: {} },
    );

    act(() => result.current.setCounterpartyId(manualCounterpartyId));
    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe(manualCounterpartyId);
  });
});

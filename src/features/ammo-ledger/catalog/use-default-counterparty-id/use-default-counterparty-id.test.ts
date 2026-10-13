import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { useDefaultCounterpartyId } from "./use-default-counterparty-id";

const pickerData = {
  recent: [{ id: "recent-shop", name: "最近の店", address: "東京都" }],
  registered: [{ id: "registered-shop", name: "登録済みの店", address: "千葉県" }],
} as unknown as MasterPickerData;

describe("useDefaultCounterpartyId", () => {
  it("一覧が届いたら最近使った相手方を既定値にする", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data?: MasterPickerData }) => useDefaultCounterpartyId({ pickerData: data }),
      { initialProps: {} },
    );
    expect(result.current.counterpartyId).toBe(manualCounterpartyId);

    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe("recent-shop");
  });

  it("編集中の記録の相手方を一覧の到着で上書きしない", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data?: MasterPickerData }) =>
        useDefaultCounterpartyId({ initialCounterpartyId: "saved-shop", pickerData: data }),
      { initialProps: {} },
    );

    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe("saved-shop");
  });

  it("一覧の到着前に利用者が選んだ相手方を上書きしない", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data?: MasterPickerData }) => useDefaultCounterpartyId({ pickerData: data }),
      { initialProps: {} },
    );

    act(() => result.current.setCounterpartyId(manualCounterpartyId));
    rerender({ data: pickerData });
    expect(result.current.counterpartyId).toBe(manualCounterpartyId);
  });
});

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

/**
 * 相手方の選択値を持ち、一覧が届いたら最近使った相手方を既定値にする。
 * 初期値があるとき、または一覧の到着前に利用者が選んだときは上書きしない。
 */
export function useDefaultCounterpartyId({
  initialCounterpartyId,
  pickerData,
}: {
  initialCounterpartyId?: string;
  pickerData?: MasterPickerData;
}) {
  const [counterpartyId, setCounterpartyIdState] = useState(
    initialCounterpartyId ?? manualCounterpartyId,
  );
  const isDecided = useRef(Boolean(initialCounterpartyId));

  useEffect(() => {
    if (!pickerData || isDecided.current) {
      return;
    }
    isDecided.current = true;
    setCounterpartyIdState(
      pickerData.recent[0]?.id ?? pickerData.registered[0]?.id ?? manualCounterpartyId,
    );
  }, [pickerData]);

  const setCounterpartyId = useCallback((nextCounterpartyId: string) => {
    isDecided.current = true;
    setCounterpartyIdState(nextCounterpartyId);
  }, []);

  return { counterpartyId, setCounterpartyId };
}

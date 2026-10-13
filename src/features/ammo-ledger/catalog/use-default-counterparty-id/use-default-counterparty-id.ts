"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";

/**
 * 相手方の選択値を持つ。一覧が届くまでは未選択にし、手入力欄を一瞬だけ出すことはしない。
 * defaultsToRecent のときは、一覧が届いたら最近使った相手方（なければ登録済みの先頭）を既定値にする。
 * 一覧を取得できなければ、入力を続けられるよう手入力にする。
 * 初期値があるとき、または一覧の到着前に利用者が選んだときは上書きしない。
 */
export function useDefaultCounterpartyId({
  initialCounterpartyId,
  pickerData,
  pickerError,
  defaultsToRecent,
}: {
  initialCounterpartyId?: string;
  pickerData?: MasterPickerData;
  pickerError?: unknown;
  defaultsToRecent: boolean;
}) {
  const [counterpartyId, setCounterpartyIdState] = useState(initialCounterpartyId ?? "");
  const isDecided = useRef(Boolean(initialCounterpartyId));

  useEffect(() => {
    if (isDecided.current || (!pickerData && !pickerError)) {
      return;
    }
    isDecided.current = true;
    if (!pickerData) {
      setCounterpartyIdState(manualCounterpartyId);
    } else if (defaultsToRecent) {
      setCounterpartyIdState(
        pickerData.recent[0]?.id ?? pickerData.registered[0]?.id ?? manualCounterpartyId,
      );
    }
  }, [pickerData, pickerError, defaultsToRecent]);

  const setCounterpartyId = useCallback((nextCounterpartyId: string) => {
    isDecided.current = true;
    setCounterpartyIdState(nextCounterpartyId);
  }, []);

  return { counterpartyId, setCounterpartyId };
}

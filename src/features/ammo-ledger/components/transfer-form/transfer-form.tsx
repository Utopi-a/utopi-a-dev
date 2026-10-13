"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoType } from "@/db/schema/ammo-ledger";
import { useDefaultCounterpartyId } from "@/features/ammo-ledger/catalog/use-default-counterparty-id/use-default-counterparty-id";
import {
  findPickerMaster,
  useMasterPickerData,
} from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { usePurposeFollowingAmmoType } from "@/features/ammo-ledger/components/purpose-select/use-purpose-following-ammo-type";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { useLedgerTransactionSubmit } from "@/features/ammo-ledger/transactions/use-ledger-transaction-submit/use-ledger-transaction-submit";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type TransferFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  ledgerEntryId?: string;
  initialValues?: TransferFormValues;
};

type TransferFormValues = {
  occurredOn?: string;
  purpose?: LedgerPurpose;
  ammoTypeId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
  boxCount?: number;
  looseRounds?: number;
  memo?: string;
  ledgerNote?: string;
};

export function TransferForm({ ammoTypes, ledgerEntryId, initialValues }: TransferFormProps) {
  const { submit, restoredValues } = useLedgerTransactionSubmit<TransferFormValues>({
    formKey: "transfer",
    ledgerEntryId,
  });
  const initial = restoredValues ?? initialValues;
  const today = getTokyoIsoDate();
  const { pickerData: counterpartyPickerData } = useMasterPickerData({
    catalogKind: "gun_shop",
    enabled: true,
  });

  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? today);
  const { ammoTypeId, purpose, selectAmmoType, choosePurpose } = usePurposeFollowingAmmoType({
    ammoTypes,
    initialAmmoTypeId: initial?.ammoTypeId,
    initialPurpose: initial?.purpose,
    keepsPurpose: Boolean(ledgerEntryId || restoredValues),
  });
  const { counterpartyId, setCounterpartyId } = useDefaultCounterpartyId({
    initialCounterpartyId: initial?.counterpartyId,
    pickerData: counterpartyPickerData,
  });

  const [boxCount, setBoxCount] = useState(String(initial?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initial?.looseRounds ?? 0));
  const [counterpartyName, setCounterpartyName] = useState(initial?.counterpartyName ?? "");
  const [counterpartyAddress, setCounterpartyAddress] = useState(
    initial?.counterpartyAddress ?? "",
  );
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [ledgerNote, setLedgerNote] = useState(initial?.ledgerNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);
  const isManualCounterparty = counterpartyId === manualCounterpartyId;

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, boxCount, looseRounds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const payload = {
        inputKind: "transfer" as const,
        purpose,
        occurredOn,
        ammoTypeId,
        boxCount: Number(boxCount) || 0,
        looseRounds: Number(looseRounds) || 0,
        ...(isManualCounterparty ? { counterpartyName, counterpartyAddress } : { counterpartyId }),
        memo: memo || undefined,
        ledgerNote: ledgerNote || undefined,
      };

      const counterpartyMaster = isManualCounterparty
        ? undefined
        : findPickerMaster({ pickerData: counterpartyPickerData, id: counterpartyId });
      const result = await submit({
        payload,
        display: {
          counterpartyName: counterpartyMaster?.name,
          counterpartyAddress: counterpartyMaster?.address,
        },
        subject: "譲渡記録",
        restoreValues: { ...payload, counterpartyId },
      });
      // 成功時は帳簿へ移動するため、二重送信を防ぐよう処理中のままにする。
      if (!result.ok) {
        setError(result.error);
        setIsPending(false);
      }
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
      setIsPending(false);
    }
  }

  // 受入画面では全タブのフォームを保持するため、入力欄の id をフォームごとに分ける。
  const idPrefix = useId();

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-occurred-on`}>日付</Label>
        <IsoDateInput
          id={`${idPrefix}-occurred-on`}
          required
          value={occurredOn}
          onChange={({ value }) => setOccurredOn(value)}
        />
      </div>

      <FieldSelect
        id={`${idPrefix}-ammo-type`}
        label="弾"
        value={ammoTypeId}
        onChange={selectAmmoType}
        options={ammoTypes.map((t) => ({
          value: t.id,
          label: `${t.name}（1箱${t.roundsPerBox}発）`,
        }))}
        required
      />

      <PurposeSelect id={`${idPrefix}-purpose`} value={purpose} onChange={choosePurpose} />

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-box-count`}>箱数</Label>
          <Input
            id={`${idPrefix}-box-count`}
            type="number"
            min={0}
            value={boxCount}
            onChange={(e) => setBoxCount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-loose-rounds`}>バラ</Label>
          <Input
            id={`${idPrefix}-loose-rounds`}
            type="number"
            min={0}
            value={looseRounds}
            onChange={(e) => setLooseRounds(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">譲渡数量（法定出力）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      <MasterPicker
        id={`${idPrefix}-counterparty`}
        label="譲渡先"
        value={counterpartyId}
        onChange={setCounterpartyId}
        catalogKind="gun_shop"
        sheetTitle="譲渡先を選ぶ"
        manualOption={{ value: manualCounterpartyId, label: "手入力" }}
        required
      />

      {isManualCounterparty ? (
        <>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-counterparty-name`}>相手方氏名</Label>
            <Input
              id={`${idPrefix}-counterparty-name`}
              required
              value={counterpartyName}
              onChange={(e) => setCounterpartyName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-counterparty-address`}>相手方住所</Label>
            <Input
              id={`${idPrefix}-counterparty-address`}
              required
              value={counterpartyAddress}
              onChange={(e) => setCounterpartyAddress(e.target.value)}
            />
          </div>
        </>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-ledger-note`}>帳簿摘要の補足（任意）</Label>
        <Input
          id={`${idPrefix}-ledger-note`}
          maxLength={500}
          value={ledgerNote}
          onChange={(e) => setLedgerNote(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-memo`}>メモ（帳簿には出ません）</Label>
        <Input id={`${idPrefix}-memo`} value={memo} onChange={(e) => setMemo(e.target.value)} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending || computedRounds <= 0}>
        {isPending ? "保存中…" : ledgerEntryId ? "更新" : "保存"}
      </Button>
    </form>
  );
}

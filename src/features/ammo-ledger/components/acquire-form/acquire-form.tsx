"use client";

import { useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoAcquisitionPermit, ammoType } from "@/db/schema/ammo-ledger";
import { useDefaultCounterpartyId } from "@/features/ammo-ledger/catalog/use-default-counterparty-id/use-default-counterparty-id";
import {
  findPickerMaster,
  useMasterPickerData,
} from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { usePurposeFollowingAmmoType } from "@/features/ammo-ledger/components/purpose-select/use-purpose-following-ammo-type";
import { hasActiveAcquisitionPermit } from "@/features/ammo-ledger/permit/has-active-acquisition-permit/has-active-acquisition-permit";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { useLedgerTransactionSubmit } from "@/features/ammo-ledger/transactions/use-ledger-transaction-submit/use-ledger-transaction-submit";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type AcquireFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  ledgerEntryId?: string;
  initialValues?: AcquireFormValues;
};

type AcquireFormValues = {
  occurredOn?: string;
  purpose?: LedgerPurpose;
  ammoTypeId?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  counterpartyAddress?: string;
  outerBoxCount?: number;
  boxCount?: number;
  looseRounds?: number;
  memo?: string;
  ledgerNote?: string;
};

export function AcquireForm({
  permits,
  ammoTypes,
  ledgerEntryId,
  initialValues,
}: AcquireFormProps) {
  const { submit, restoredValues } = useLedgerTransactionSubmit<AcquireFormValues>({
    formKey: "acquire",
    ledgerEntryId,
  });
  const initial = restoredValues ?? initialValues;
  const today = getTokyoIsoDate();
  const { pickerData: counterpartyPickerData } = useMasterPickerData({
    catalogKind: "gun_shop",
    includeRangeCatalog: true,
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

  const [outerBoxCount, setOuterBoxCount] = useState(String(initial?.outerBoxCount ?? 0));
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
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, outerBoxCount, boxCount, looseRounds]);
  const hasValidPermit = hasActiveAcquisitionPermit({ permits, purpose, occurredOn });

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const payload = {
        inputKind: "acquire" as const,
        purpose,
        occurredOn,
        ammoTypeId,
        outerBoxCount: Number(outerBoxCount) || 0,
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
        subject: "取得記録",
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
          label: `${t.name}（小箱${t.roundsPerBox}発）`,
        }))}
        required
      />

      <PurposeSelect id={`${idPrefix}-purpose`} value={purpose} onChange={choosePurpose} />

      {!hasValidPermit ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          この譲受日に有効な{ledgerPurposeLabels[purpose]}
          の譲受許可がありません。用途または許可期間を確認してください。
        </p>
      ) : null}

      <PackagingFields
        idPrefix={idPrefix}
        outerBoxCount={outerBoxCount}
        boxCount={boxCount}
        looseRounds={looseRounds}
        onOuterBoxCountChange={setOuterBoxCount}
        onBoxCountChange={setBoxCount}
        onLooseRoundsChange={setLooseRounds}
      />

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">譲受数量（法定出力）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      <MasterPicker
        id={`${idPrefix}-counterparty`}
        label="譲渡元（購入先）"
        value={counterpartyId}
        onChange={setCounterpartyId}
        catalogKind="gun_shop"
        includeRangeCatalog
        sheetTitle="購入先を選ぶ"
        manualOption={{ value: manualCounterpartyId, label: "手入力する" }}
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

      <Button type="submit" disabled={isPending || computedRounds <= 0 || !hasValidPermit}>
        {isPending ? "保存中…" : ledgerEntryId ? "更新" : "保存"}
      </Button>
    </form>
  );
}

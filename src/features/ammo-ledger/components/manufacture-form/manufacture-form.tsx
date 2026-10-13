"use client";

import { useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ammoType } from "@/db/schema/ammo-ledger";
import { AmmoTypeSelect } from "@/features/ammo-ledger/components/ammo-type-select/ammo-type-select";
import { LedgerEntryDateField } from "@/features/ammo-ledger/components/ledger-entry-date-field/ledger-entry-date-field";
import { LedgerEntrySubmitBar } from "@/features/ammo-ledger/components/ledger-entry-submit-bar/ledger-entry-submit-bar";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { usePurposeFollowingAmmoType } from "@/features/ammo-ledger/components/purpose-select/use-purpose-following-ammo-type";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { useLedgerTransactionSubmit } from "@/features/ammo-ledger/transactions/use-ledger-transaction-submit/use-ledger-transaction-submit";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type ManufactureFormProps = {
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
  ledgerEntryId?: string;
  initialValues?: ManufactureFormValues;
};

type ManufactureFormValues = {
  occurredOn?: string;
  purpose?: LedgerPurpose;
  ammoTypeId?: string;
  outerBoxCount?: number;
  boxCount?: number;
  looseRounds?: number;
  memo?: string;
  ledgerNote?: string;
};

export function ManufactureForm({
  ammoTypes,
  stockByAmmoTypeId,
  ledgerEntryId,
  initialValues,
}: ManufactureFormProps) {
  const { submit, restoredValues } = useLedgerTransactionSubmit<ManufactureFormValues>({
    formKey: "manufacture",
    ledgerEntryId,
  });
  const initial = restoredValues ?? initialValues;
  const today = getTokyoIsoDate();

  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? today);
  const { ammoTypeId, purpose, selectAmmoType, choosePurpose } = usePurposeFollowingAmmoType({
    ammoTypes,
    initialAmmoTypeId: initial?.ammoTypeId,
    initialPurpose: initial?.purpose,
    keepsPurpose: Boolean(ledgerEntryId || restoredValues),
  });
  const [outerBoxCount, setOuterBoxCount] = useState(String(initial?.outerBoxCount ?? 0));
  const [boxCount, setBoxCount] = useState(String(initial?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initial?.looseRounds ?? 0));
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [ledgerNote, setLedgerNote] = useState(initial?.ledgerNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, outerBoxCount, boxCount, looseRounds]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const payload = {
        inputKind: "manufacture" as const,
        purpose,
        occurredOn,
        ammoTypeId,
        outerBoxCount: Number(outerBoxCount) || 0,
        boxCount: Number(boxCount) || 0,
        looseRounds: Number(looseRounds) || 0,
        memo: memo || undefined,
        ledgerNote: ledgerNote || undefined,
      };

      const result = await submit({
        payload,
        subject: "製造記録",
        restoreValues: payload,
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
      <LedgerEntryDateField
        id={`${idPrefix}-occurred-on`}
        value={occurredOn}
        onChange={setOccurredOn}
      />

      <AmmoTypeSelect
        id={`${idPrefix}-ammo-type`}
        value={ammoTypeId}
        onChange={selectAmmoType}
        ammoTypes={ammoTypes}
        stockByAmmoTypeId={stockByAmmoTypeId}
      />

      <PurposeSelect id={`${idPrefix}-purpose`} value={purpose} onChange={choosePurpose} />

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
        <p className="text-muted-foreground">製造数量（法定出力）</p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

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

      <LedgerEntrySubmitBar
        label={ledgerEntryId ? "更新" : "保存"}
        isPending={isPending}
        disabled={computedRounds <= 0}
        error={error}
      />
    </form>
  );
}

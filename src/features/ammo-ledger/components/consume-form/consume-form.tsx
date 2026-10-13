"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun, ammoType } from "@/db/schema/ammo-ledger";
import {
  findPickerMaster,
  useMasterPickerData,
} from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import { buildAmmoTypeFieldOptions } from "@/features/ammo-ledger/master/build-ammo-type-field-options/build-ammo-type-field-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { resolveDefaultPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import { computeRounds } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";
import { useLedgerTransactionSubmit } from "@/features/ammo-ledger/transactions/use-ledger-transaction-submit/use-ledger-transaction-submit";
import { cn } from "@/lib/cn";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type ConsumeFormProps = {
  guns: (typeof ammoGun.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
  ledgerEntryId?: string;
  initialValues?: ConsumeFormValues;
};

type ConsumeFormValues = {
  occurredOn?: string;
  purpose?: LedgerPurpose;
  ammoTypeId?: string;
  gunId?: string;
  rangeId?: string;
  location?: string;
  outerBoxCount?: number;
  boxCount?: number;
  looseRounds?: number;
  memo?: string;
  ledgerNote?: string;
};

type ConsumptionLocationInputKind = "range" | "manual";

export function ConsumeForm({
  guns,
  ammoTypes,
  stockByAmmoTypeId,
  ledgerEntryId,
  initialValues,
}: ConsumeFormProps) {
  const { submit, restoredValues } = useLedgerTransactionSubmit<ConsumeFormValues>({
    formKey: "consume",
    ledgerEntryId,
  });
  const { pickerData: rangePickerData } = useMasterPickerData({
    catalogKind: "range",
    enabled: true,
  });
  const initial = restoredValues ?? initialValues;
  const today = getTokyoIsoDate();

  const [occurredOn, setOccurredOn] = useState(initial?.occurredOn ?? today);
  const [ammoTypeId, setAmmoTypeId] = useState(initial?.ammoTypeId ?? "");
  const [gunId, setGunId] = useState(initial?.gunId ?? "");
  const [purpose, setPurpose] = useState<LedgerPurpose>(initial?.purpose ?? "shooting");
  const [locationInputKind, setLocationInputKind] = useState<ConsumptionLocationInputKind>(
    initial?.rangeId || !initial?.purpose || initial.purpose === "shooting" ? "range" : "manual",
  );
  const [rangeId, setRangeId] = useState(initial?.rangeId ?? "");
  // 新規入力では最近使った射撃場を初期値にする。編集・入力の復元・利用者の選択は上書きしない。
  const isRangeDecided = useRef(Boolean(initial?.rangeId || ledgerEntryId || restoredValues));
  const [previousLocation] = useState(initial?.location);
  // 射撃場で消費した前回の場所は、手入力欄には入れず射撃場の選択に使う。
  const [location, setLocation] = useState(
    locationInputKind === "manual" ? (initial?.location ?? "") : "",
  );
  const [outerBoxCount, setOuterBoxCount] = useState(String(initial?.outerBoxCount ?? 0));
  const [boxCount, setBoxCount] = useState(String(initial?.boxCount ?? 0));
  const [looseRounds, setLooseRounds] = useState(String(initial?.looseRounds ?? 0));
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [ledgerNote, setLedgerNote] = useState(initial?.ledgerNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!rangePickerData || isRangeDecided.current) {
      return;
    }
    isRangeDecided.current = true;
    const previousRange = previousLocation
      ? [...rangePickerData.recent, ...rangePickerData.registered].find(
          (range) =>
            range.name === previousLocation ||
            `${range.name} ${range.address}` === previousLocation,
        )
      : undefined;
    const defaultRangeId =
      previousRange?.id ??
      rangePickerData.recent[0]?.id ??
      (rangePickerData.registered.length === 1 ? rangePickerData.registered[0].id : undefined);
    if (defaultRangeId) {
      setRangeId(defaultRangeId);
    }
  }, [rangePickerData, previousLocation]);

  function handleRangeChange(nextRangeId: string) {
    isRangeDecided.current = true;
    setRangeId(nextRangeId);
  }

  const selectedAmmoType = ammoTypes.find((t) => t.id === ammoTypeId);

  function handleAmmoTypeChange({ nextAmmoTypeId }: { nextAmmoTypeId: string }) {
    setAmmoTypeId(nextAmmoTypeId);
    const nextType = ammoTypes.find((t) => t.id === nextAmmoTypeId);
    if (nextType && !ledgerEntryId) {
      const nextPurpose = resolveDefaultPurpose({ defaultPurpose: nextType.defaultPurpose });
      setPurpose(nextPurpose);
      setLocationInputKind(
        nextPurpose === "shooting"
          ? "range"
          : purpose === "shooting"
            ? "manual"
            : locationInputKind,
      );
    }
  }

  function handlePurposeChange({ nextPurpose }: { nextPurpose: LedgerPurpose }) {
    setPurpose(nextPurpose);
    if (nextPurpose === "shooting") {
      setLocationInputKind("range");
    } else if (purpose === "shooting") {
      setLocationInputKind("manual");
    }
  }

  const ammoTypeOptions = useMemo(
    () => buildAmmoTypeFieldOptions({ ammoTypes, stockByAmmoTypeId }),
    [ammoTypes, stockByAmmoTypeId],
  );

  const computedRounds = useMemo(() => {
    if (!selectedAmmoType) return 0;
    return computeRounds({
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      roundsPerBox: selectedAmmoType.roundsPerBox,
    });
  }, [selectedAmmoType, outerBoxCount, boxCount, looseRounds]);

  const bookStock = selectedAmmoType ? (stockByAmmoTypeId[selectedAmmoType.id] ?? 0) : undefined;
  const stockAfterConsumption = bookStock !== undefined ? bookStock - computedRounds : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const usesRange = purpose === "shooting" || locationInputKind === "range";
    const values = {
      occurredOn,
      purpose,
      ammoTypeId,
      gunId,
      rangeId: usesRange ? rangeId : undefined,
      location: usesRange ? undefined : location,
      outerBoxCount: Number(outerBoxCount) || 0,
      boxCount: Number(boxCount) || 0,
      looseRounds: Number(looseRounds) || 0,
      memo: memo || undefined,
      ledgerNote: ledgerNote || undefined,
    };
    const range = usesRange
      ? findPickerMaster({ pickerData: rangePickerData, id: rangeId })
      : undefined;

    try {
      const result = await submit({
        payload: { inputKind: "consume", ...values },
        display: { rangeName: range?.name, rangeAddress: range?.address },
        subject: "消費記録",
        restoreValues: values,
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

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="occurred-on">日付</Label>
        <IsoDateInput
          id="occurred-on"
          required
          value={occurredOn}
          onChange={({ value }) => setOccurredOn(value)}
        />
      </div>

      <PurposeSelect
        value={purpose}
        onChange={(nextPurpose) => handlePurposeChange({ nextPurpose })}
      />

      {purpose !== "shooting" ? (
        <FieldSelect
          id="location-input-kind"
          label="消費場所"
          value={locationInputKind}
          onChange={(value) => setLocationInputKind(value as ConsumptionLocationInputKind)}
          options={[
            { value: "manual", label: "狩猟・駆除場所" },
            { value: "range", label: "射撃場" },
          ]}
          placeholder=""
          required
        />
      ) : null}

      {purpose === "shooting" || locationInputKind === "range" ? (
        <MasterPicker
          id="range"
          label="場所"
          value={rangeId}
          onChange={handleRangeChange}
          catalogKind="range"
          sheetTitle="射撃場を選ぶ"
          required
        />
      ) : (
        <div className="space-y-2">
          <Label htmlFor="location">場所</Label>
          <Input
            id="location"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={purpose === "hunting" ? "狩猟場所" : "有害鳥獣駆除場所"}
          />
        </div>
      )}

      <FieldSelect
        id="gun"
        label="銃"
        value={gunId}
        onChange={setGunId}
        options={guns.map((g) => ({
          value: g.id,
          label: `${g.name}（${g.gunNumber} / ${g.permitNumber}）`,
        }))}
        required
      />

      <FieldSelect
        id="ammo-type"
        label="弾"
        value={ammoTypeId}
        onChange={(value) => handleAmmoTypeChange({ nextAmmoTypeId: value })}
        options={ammoTypeOptions}
        required
      />

      <PackagingFields
        outerBoxCount={outerBoxCount}
        boxCount={boxCount}
        looseRounds={looseRounds}
        onOuterBoxCountChange={setOuterBoxCount}
        onBoxCountChange={setBoxCount}
        onLooseRoundsChange={setLooseRounds}
        looseLabel="バラ（±）"
      />

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">実消費（法定出力に使われる数量）</p>
        <p className="text-lg font-semibold tabular-nums">{computedRounds}発</p>
        {stockAfterConsumption !== undefined ? (
          <p
            className={cn(
              "mt-1 text-xs tabular-nums",
              stockAfterConsumption < 0
                ? "font-medium text-amber-700 dark:text-amber-300"
                : "text-muted-foreground",
            )}
          >
            帳簿残数（全用途）{bookStock}発 → 消費後 {stockAfterConsumption}発
            {stockAfterConsumption < 0 ? "（残数を超えています）" : ""}
          </p>
        ) : null}
      </div>

      <details
        className="rounded-lg border border-border/60 px-4 py-3"
        open={Boolean(initial?.ledgerNote || initial?.memo)}
      >
        <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
          帳簿摘要の補足・メモ（任意）
        </summary>
        <div className="mt-3 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ledger-note">帳簿摘要の補足</Label>
            <Input
              id="ledger-note"
              maxLength={500}
              value={ledgerNote}
              onChange={(e) => setLedgerNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">メモ（帳簿には出ません）</Label>
            <Input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
        </div>
      </details>

      {/* モバイルでは保存ボタンを画面下に固定し、入力の途中でもすぐ保存できるようにする。 */}
      <div className="sticky bottom-0 z-10 -mx-4 space-y-2 border-t border-border/60 bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          type="submit"
          className="h-12 w-full text-base sm:h-9 sm:w-auto sm:text-sm"
          disabled={isPending || computedRounds <= 0}
        >
          {isPending ? "保存中…" : ledgerEntryId ? "更新" : "保存"}
        </Button>
      </div>
    </form>
  );
}

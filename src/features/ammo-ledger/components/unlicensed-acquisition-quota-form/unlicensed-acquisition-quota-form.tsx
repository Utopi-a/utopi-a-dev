"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { useAmmoLedgerMutationNavigation } from "@/features/ammo-ledger/navigation/use-ammo-ledger-mutation-navigation/use-ammo-ledger-mutation-navigation";
import { createUnlicensedAcquisitionQuotaAction } from "@/features/ammo-ledger/permit/create-unlicensed-acquisition-quota/create-unlicensed-acquisition-quota-action";
import { defaultUnlicensedQuotaPeriod } from "@/features/ammo-ledger/permit/default-unlicensed-quota-period/default-unlicensed-quota-period";
import { ledgerPurposeLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import {
  type UnlicensedAcquisitionPurpose,
  unlicensedAcquisitionBasisLabels,
  unlicensedAcquisitionPurposes,
  unlicensedAcquisitionRifleRoundLimit,
  unlicensedAcquisitionRoundLimit,
} from "@/features/ammo-ledger/schema/unlicensed-acquisition-quota-schema";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type UnlicensedAcquisitionQuotaFormProps = {
  /** 記録画面から登録に来たとき、保存後に戻る検証済みのパス */
  returnTo?: string | null;
};

export function UnlicensedAcquisitionQuotaForm({ returnTo }: UnlicensedAcquisitionQuotaFormProps) {
  const navigateAfterMutation = useAmmoLedgerMutationNavigation();
  const today = getTokyoIsoDate();
  const initialPeriod = defaultUnlicensedQuotaPeriod({ purpose: "hunting", today });

  const [ledgerPurpose, setLedgerPurpose] = useState<UnlicensedAcquisitionPurpose>("hunting");
  const [startsOn, setStartsOn] = useState(initialPeriod.startsOn);
  const [endsOn, setEndsOn] = useState(initialPeriod.endsOn);
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const basisLabel = unlicensedAcquisitionBasisLabels[ledgerPurpose];

  function handlePurposeChange(value: UnlicensedAcquisitionPurpose) {
    setLedgerPurpose(value);
    const period = defaultUnlicensedQuotaPeriod({ purpose: value, today });
    setStartsOn(period.startsOn);
    setEndsOn(period.endsOn);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const result = await createUnlicensedAcquisitionQuotaAction({
        ledgerPurpose,
        startsOn,
        endsOn,
        memo: memo || undefined,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      showAmmoLedgerToast({ action: "created", subject: "無許可譲受の枠" });
      navigateAfterMutation({ href: returnTo ?? buildLedgerHref({ purpose: ledgerPurpose }) });
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FieldSelect
        id="unlicensed-purpose"
        label="用途区分"
        value={ledgerPurpose}
        onChange={(value) => handlePurposeChange(value as UnlicensedAcquisitionPurpose)}
        options={unlicensedAcquisitionPurposes.map((purpose) => ({
          value: purpose,
          label: `${ledgerPurposeLabels[purpose]}（${unlicensedAcquisitionBasisLabels[purpose]}）`,
        }))}
        required
        placeholder=""
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="unlicensed-starts-on">{basisLabel}の有効期間（から）</Label>
          <IsoDateInput
            id="unlicensed-starts-on"
            required
            value={startsOn}
            onChange={({ value }) => {
              setStartsOn(value);
              if (endsOn < value) {
                setEndsOn(value);
              }
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="unlicensed-ends-on">（まで）</Label>
          <IsoDateInput
            id="unlicensed-ends-on"
            required
            value={endsOn}
            min={startsOn}
            onChange={({ value }) => setEndsOn(value)}
          />
        </div>
      </div>

      <p className="text-sm">
        この期間に許可なく譲り受けられる実包は
        <span className="font-medium tabular-nums">{unlicensedAcquisitionRoundLimit}個</span>
        （うちライフル実包{unlicensedAcquisitionRifleRoundLimit}個）までです。
      </p>

      <div className="space-y-2">
        <Label htmlFor="unlicensed-memo">メモ</Label>
        <Input
          id="unlicensed-memo"
          placeholder="登録した都道府県など"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "登録中…" : "枠を登録"}
      </Button>
    </form>
  );
}

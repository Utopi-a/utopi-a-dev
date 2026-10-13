"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun } from "@/db/schema/ammo-ledger";
import type { AcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/acquisition-permit-application-types";
import {
  type ApplicationAmmoName,
  applicationAmmoNameOptions,
  defaultApplicationAmmoName,
} from "@/features/ammo-ledger/acquisition-permit-application/application-ammo-name/application-ammo-name";
import {
  type ApplicationFormDraft,
  clearApplicationFormDraft,
  loadApplicationFormDraft,
  saveApplicationFormDraft,
} from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-form-draft";
import { saveAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import { ConsumptionPlanPreview } from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-preview/consumption-plan-preview";
import {
  buildRangeAllocationsFromRows,
  ConsumptionPlanRangeAllocationList,
  createInitialRangeAllocationRows,
} from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-range-allocation-list/consumption-plan-range-allocation-list";
import { buildConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/build-consumption-plan/build-consumption-plan";
import type { ConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/consumption-plan-types";
import { resolveSubmissionPrefecture } from "@/features/ammo-ledger/acquisition-permit-application/resolve-submission-prefecture/resolve-submission-prefecture";
import type {
  MasterPickerData,
  PickerMasterEntry,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { useMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { WorkspaceViewLoader } from "@/features/ammo-ledger/components/workspace-view-loader/workspace-view-loader";
import {
  type AcquisitionPermitPurpose,
  acquisitionPermitPurposeOptions,
  defaultAcquisitionPermitPurpose,
} from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import { cn } from "@/lib/cn";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type AcquisitionPermitApplicationFormProps = {
  ownerName: string;
  ownerFurigana?: string;
  possessionPermitCertificateNumber?: string;
  ownerAddress: string;
  ownerBirthDate?: string;
  ownerPhone?: string;
  currentHomeStock: number;
  guns: (typeof ammoGun.$inferSelect)[];
};

function defaultValidTo({ validFrom }: { validFrom: string }): string {
  const [year, month, day] = validFrom.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setFullYear(date.getFullYear() + 1);
  date.setDate(date.getDate() - 1);
  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function AcquisitionPermitApplicationForm({
  ownerName,
  ownerFurigana = "",
  possessionPermitCertificateNumber = "",
  ownerAddress,
  ownerBirthDate = "",
  ownerPhone = "",
  currentHomeStock,
  guns,
}: AcquisitionPermitApplicationFormProps) {
  const router = useRouter();
  const today = getTokyoIsoDate();
  const { pickerData: rangePickerData } = useMasterPickerData({
    catalogKind: "range",
    enabled: true,
  });
  const { pickerData: counterpartyPickerData } = useMasterPickerData({
    catalogKind: "gun_shop",
    enabled: true,
  });
  const pickerDefaultsApplied = useRef(false);

  function createInitialDraft(): ApplicationFormDraft {
    return {
      prefectureName: resolveSubmissionPrefecture({ ownerAddress }),
      applicationDate: today,
      ownerName,
      ownerFurigana,
      ownerAddress,
      ownerBirthDate,
      ownerPhone,
      possessionPermitCertificateNumber,
      ammoName: defaultApplicationAmmoName,
      permitPurpose: defaultAcquisitionPermitPurpose,
      requestedQuantity: "5000",
      homeStock: String(currentHomeStock),
      validFrom: today,
      validTo: defaultValidTo({ validFrom: today }),
      storageLocation: "自宅装弾ロッカー",
      selectedGunIds: guns.length > 0 ? [guns[0].id] : [],
      counterparty: null,
      rangeAllocationRows: [],
    };
  }

  const [draft, setDraft] = useState(createInitialDraft);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [consumptionPlan, setConsumptionPlan] = useState<ConsumptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateDraft(patch: Partial<ApplicationFormDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  // sessionStorage はサーバー描画時に読めないため、マウント後に復元する。
  useEffect(() => {
    const savedDraft = loadApplicationFormDraft();
    if (savedDraft) {
      setDraft(savedDraft);
    }
    setIsDraftRestored(true);
  }, []);

  useEffect(() => {
    if (isDraftRestored) {
      saveApplicationFormDraft({ draft });
    }
  }, [draft, isDraftRestored]);

  useEffect(() => {
    if (
      !isDraftRestored ||
      !counterpartyPickerData ||
      !rangePickerData ||
      pickerDefaultsApplied.current
    ) {
      return;
    }

    setDraft((current) =>
      fillPickerDefaults({ draft: current, counterpartyPickerData, rangePickerData }),
    );
    pickerDefaultsApplied.current = true;
  }, [isDraftRestored, counterpartyPickerData, rangePickerData]);

  const selectedGuns = guns.filter((gun) => draft.selectedGunIds.includes(gun.id));
  const gunType = selectedGuns.map((gun) => gun.gunType).join("、");
  const compatibleAmmunition = draft.ammoName;
  const gunTypeAndCaliber = selectedGuns.map((gun) => `${gun.gunType} ${gun.caliber}`).join("、");

  function handleValidFromChange(value: string) {
    updateDraft({ validFrom: value, validTo: defaultValidTo({ validFrom: value }) });
  }

  function toggleGunId({ gunId }: { gunId: string }) {
    setDraft((current) => ({
      ...current,
      selectedGunIds: current.selectedGunIds.includes(gunId)
        ? current.selectedGunIds.filter((id) => id !== gunId)
        : [...current.selectedGunIds, gunId],
    }));
  }

  function handleCounterpartySelect({ master }: { master: PickerMasterEntry }) {
    updateDraft({
      counterparty: { id: master.id, name: master.name, address: master.address },
    });
  }

  function handleReset() {
    clearApplicationFormDraft();
    const initialDraft = createInitialDraft();
    setDraft(
      counterpartyPickerData && rangePickerData
        ? fillPickerDefaults({ draft: initialDraft, counterpartyPickerData, rangePickerData })
        : initialDraft,
    );
    setConsumptionPlan(null);
    setError(null);
    setIsResetConfirmOpen(false);
  }

  function handleGeneratePlan() {
    setError(null);
    const rangeAllocations = buildRangeAllocationsFromRows({
      rows: draft.rangeAllocationRows,
      permitPurpose: draft.permitPurpose,
    });

    if (rangeAllocations.length === 0) {
      setError("消費計画用の射撃場を選んでください");
      return;
    }

    if (!draft.counterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const plan = buildConsumptionPlan({
      requestedQuantity: Number(draft.requestedQuantity) || 0,
      periodFrom: draft.validFrom,
      periodTo: draft.validTo,
      currentHomeStock: Number(draft.homeStock) || 0,
      rangeAllocations,
      counterpartyName: draft.counterparty.name,
      counterpartyAddress: draft.counterparty.address,
    });

    setConsumptionPlan(plan);
  }

  function handleGoToPrint() {
    setError(null);

    if (!consumptionPlan || consumptionPlan.rows.length === 0) {
      setError("先に消費計画を生成してください");
      return;
    }

    if (!draft.counterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const payload: AcquisitionPermitApplicationPayload = {
      prefectureName: draft.prefectureName,
      applicationDate: draft.applicationDate,
      ownerName: draft.ownerName,
      ownerFurigana: draft.ownerFurigana || undefined,
      ownerAddress: draft.ownerAddress,
      ownerBirthDate: draft.ownerBirthDate || undefined,
      ownerPhone: draft.ownerPhone || undefined,
      ammoName: draft.ammoName,
      requestedQuantity: Number(draft.requestedQuantity) || 0,
      currentHomeStock: Number(draft.homeStock) || 0,
      gunType,
      compatibleAmmunition,
      possessionPermitCertificateNumber:
        draft.possessionPermitCertificateNumber.trim() || undefined,
      gunTypeAndCaliber,
      permitPurpose: draft.permitPurpose,
      validFrom: draft.validFrom,
      validTo: draft.validTo,
      storageLocation: draft.storageLocation,
      counterpartyName: draft.counterparty.name,
      counterpartyAddress: draft.counterparty.address,
      consumptionPlan,
    };

    saveApplicationFormDraft({ draft });
    saveAcquisitionPermitApplicationPayload({ payload });
    router.push("/lab/ammo-ledger/applications/acquisition-permit/print");
  }

  if (!isDraftRestored) {
    return <WorkspaceViewLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">譲受許可申請書</h1>
        <p className="text-sm text-muted-foreground">
          別記様式第2号（全国共通様式・北海道警察掲載版）に入力値を重ねて印刷します。提出先の都道府県名を入力してください。
        </p>
      </div>

      <AmmoLedgerPanel title="申請者">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="prefecture-name">提出先（公安委員会）</Label>
            <Input
              id="prefecture-name"
              value={draft.prefectureName}
              onChange={(event) => updateDraft({ prefectureName: event.target.value })}
              placeholder="茨城県"
            />
            <p className="text-xs text-muted-foreground">
              「○○公安委員会殿」の ○○ 部分。例: 茨城県、北海道
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="application-date">申請日</Label>
            <IsoDateInput
              id="application-date"
              value={draft.applicationDate}
              onChange={({ value }) => updateDraft({ applicationDate: value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-name">氏名</Label>
            <Input
              id="owner-name"
              value={draft.ownerName}
              onChange={(event) => updateDraft({ ownerName: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-furigana">ふりがな</Label>
            <Input
              id="owner-furigana"
              value={draft.ownerFurigana}
              onChange={(event) => updateDraft({ ownerFurigana: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-address">住所</Label>
            <Input
              id="owner-address"
              value={draft.ownerAddress}
              onChange={(event) => updateDraft({ ownerAddress: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-birth-date">生年月日</Label>
            <IsoDateInput
              id="owner-birth-date"
              value={draft.ownerBirthDate}
              onChange={({ value }) => updateDraft({ ownerBirthDate: value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-phone">電話番号</Label>
            <Input
              id="owner-phone"
              value={draft.ownerPhone}
              onChange={(event) => updateDraft({ ownerPhone: event.target.value })}
            />
          </div>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="許可内容">
        <div className="space-y-4">
          <FieldSelect
            id="ammo-name"
            label="火薬類の名称"
            value={draft.ammoName}
            onChange={(value) => updateDraft({ ammoName: value as ApplicationAmmoName })}
            options={applicationAmmoNameOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            required
            placeholder=""
          />

          <FieldSelect
            id="permit-purpose"
            label="譲受の目的"
            value={draft.permitPurpose}
            onChange={(value) => updateDraft({ permitPurpose: value as AcquisitionPermitPurpose })}
            options={acquisitionPermitPurposeOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            required
            placeholder=""
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="requested-quantity">申請数量（発）</Label>
              <Input
                id="requested-quantity"
                type="number"
                min={250}
                step={250}
                value={draft.requestedQuantity}
                onChange={(event) => updateDraft({ requestedQuantity: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-stock">現保有数量（発）</Label>
              <Input
                id="home-stock"
                type="number"
                min={0}
                value={draft.homeStock}
                onChange={(event) => updateDraft({ homeStock: event.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valid-from">譲受期間（開始）</Label>
              <IsoDateInput
                id="valid-from"
                value={draft.validFrom}
                onChange={({ value }) => handleValidFromChange(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-to">譲受期間（終了）</Label>
              <IsoDateInput
                id="valid-to"
                value={draft.validTo}
                min={draft.validFrom}
                onChange={({ value }) => updateDraft({ validTo: value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-location">貯蔵又は保管する場所</Label>
            <Input
              id="storage-location"
              value={draft.storageLocation}
              onChange={(event) => updateDraft({ storageLocation: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="possession-permit-certificate-number">銃砲所持許可証の番号</Label>
            <Input
              id="possession-permit-certificate-number"
              value={draft.possessionPermitCertificateNumber}
              onChange={(event) =>
                updateDraft({ possessionPermitCertificateNumber: event.target.value })
              }
              aria-describedby="possession-permit-certificate-number-help"
            />
            <p
              id="possession-permit-certificate-number-help"
              className="text-sm text-muted-foreground"
            >
              許可証に記載された番号を入力してください。銃ごとの許可番号とは別の番号です。
            </p>
          </div>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="使用銃">
        {guns.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            銃が未登録です。
            <Link href="/lab/ammo-ledger/settings/guns" className="underline">
              銃を登録
            </Link>
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {guns.map((gun) => (
              <li key={gun.id}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={draft.selectedGunIds.includes(gun.id)}
                    onChange={() => toggleGunId({ gunId: gun.id })}
                  />
                  <span>
                    {gun.name}（{gun.gunType} / {gun.caliber} / 第{gun.permitNumber}号）
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="譲渡者（購入先）">
        <MasterPicker
          id="counterparty"
          label="銃砲火薬店"
          value={draft.counterparty?.id ?? ""}
          // 店名と住所が必要なので、ID だけの onChange ではなく onMasterSelect で受け取る。
          onChange={() => {}}
          onMasterSelect={(master) => handleCounterpartySelect({ master })}
          catalogKind="gun_shop"
          sheetTitle="購入先を選ぶ"
          required
        />
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="消費（購入）計画">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            購入は250発単位、消費は100発程度以上のまとまりを基本に配分し、端数は25発単位で調整します。自宅保管は800発を超えないようにします。
          </p>

          <ConsumptionPlanRangeAllocationList
            rows={draft.rangeAllocationRows}
            onRowsChange={(rangeAllocationRows) => updateDraft({ rangeAllocationRows })}
          />

          <Button type="button" variant="outline" onClick={handleGeneratePlan}>
            消費計画を生成
          </Button>

          <ConsumptionPlanPreview plan={consumptionPlan} />
        </div>
      </AmmoLedgerPanel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/lab/ammo-ledger/settings/permits"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          譲受許可設定に戻る
        </Link>
        <Button type="button" variant="ghost" onClick={() => setIsResetConfirmOpen(true)}>
          最初からやり直す
        </Button>
        <Button type="button" onClick={handleGoToPrint}>
          印刷プレビューへ
        </Button>
      </div>

      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>入力を最初からやり直しますか？</DialogTitle>
            <DialogDescription>
              この申請書に入力した内容を消して、プロフィールの内容と既定値に戻します。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsResetConfirmOpen(false)}>
              やめる
            </Button>
            <Button type="button" variant="destructive" onClick={handleReset}>
              最初からやり直す
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function fillPickerDefaults({
  draft,
  counterpartyPickerData,
  rangePickerData,
}: {
  draft: ApplicationFormDraft;
  counterpartyPickerData: MasterPickerData;
  rangePickerData: MasterPickerData;
}): ApplicationFormDraft {
  const defaultCounterparty =
    counterpartyPickerData.recent[0] ?? counterpartyPickerData.registered[0] ?? null;

  return {
    ...draft,
    counterparty:
      draft.counterparty ??
      (defaultCounterparty
        ? {
            id: defaultCounterparty.id,
            name: defaultCounterparty.name,
            address: defaultCounterparty.address,
          }
        : null),
    rangeAllocationRows:
      draft.rangeAllocationRows.length > 0
        ? draft.rangeAllocationRows
        : createInitialRangeAllocationRows({ rangePickerData }),
  };
}

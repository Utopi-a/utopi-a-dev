"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
import type { ammoGun } from "@/db/schema/ammo-ledger";
import type { AcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/acquisition-permit-application-types";
import {
  type AmmoTypeStock,
  type ApplicationAmmoName,
  applicationAmmoNameOptions,
  defaultApplicationAmmoName,
  sumHomeStockForAmmoName,
} from "@/features/ammo-ledger/acquisition-permit-application/application-ammo-name/application-ammo-name";
import {
  type ApplicationFormDraft,
  clearApplicationFormDraft,
  loadApplicationFormDraft,
  saveApplicationFormDraft,
} from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-form-draft";
import { saveAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import {
  counterpartyFieldId,
  findMissingApplicationFields,
  generatePlanFieldId,
  type RequiredApplicationFieldKey,
  requiredApplicationFields,
  selectedGunsFieldId,
} from "@/features/ammo-ledger/acquisition-permit-application/components/acquisition-permit-application-form/application-form-fields";
import {
  RequiredFieldLabel,
  RequiredMark,
} from "@/features/ammo-ledger/acquisition-permit-application/components/acquisition-permit-application-form/required-field-label";
import { ConsumptionPlanPreview } from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-preview/consumption-plan-preview";
import {
  buildRangeAllocationsFromRows,
  ConsumptionPlanRangeAllocationList,
  createInitialRangeAllocationRows,
} from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-range-allocation-list/consumption-plan-range-allocation-list";
import { buildConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/build-consumption-plan/build-consumption-plan";
import type { BuildConsumptionPlanInput } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/consumption-plan-types";
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
import { homeStorageRoundLimit } from "@/features/ammo-ledger/schema/home-storage-limit";
import { cn } from "@/lib/cn";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type AcquisitionPermitApplicationFormProps = {
  ownerName: string;
  ownerFurigana?: string;
  possessionPermitCertificateNumber?: string;
  ownerAddress: string;
  ownerBirthDate?: string;
  ownerPhone?: string;
  /** 全弾種の自宅在庫。自宅保管の上限は弾種をまたいだ合計で見る。 */
  totalHomeStock: number;
  ammoTypeStocks: AmmoTypeStock[];
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
  totalHomeStock,
  ammoTypeStocks,
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
      homeStockOverride: null,
      validFrom: today,
      validTo: defaultValidTo({ validFrom: today }),
      storageLocation: "自宅装弾ロッカー",
      selectedGunIds: guns.length > 0 ? [guns[0].id] : [],
      counterparty: null,
      rangeAllocationRows: [],
      planInputKey: null,
    };
  }

  const [draft, setDraft] = useState(createInitialDraft);
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isPlanWarningConfirmOpen, setIsPlanWarningConfirmOpen] = useState(false);
  const [isMissingFieldsShown, setIsMissingFieldsShown] = useState(false);
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

  const ledgerHomeStock = sumHomeStockForAmmoName({ ammoName: draft.ammoName, ammoTypeStocks });
  const homeStock = draft.homeStockOverride ?? String(ledgerHomeStock);
  // 自宅保管の上限は弾種をまたいだ合計なので、計画にはほかの弾種の在庫も含める。
  const otherHomeStock = Math.max(0, totalHomeStock - ledgerHomeStock);
  const rangeAllocations = buildRangeAllocationsFromRows({
    rows: draft.rangeAllocationRows,
    permitPurpose: draft.permitPurpose,
  });
  const planInput: BuildConsumptionPlanInput | null =
    draft.counterparty && rangeAllocations.length > 0
      ? {
          requestedQuantity: Number(draft.requestedQuantity) || 0,
          periodFrom: draft.validFrom,
          periodTo: draft.validTo,
          currentHomeStock: otherHomeStock + (Number(homeStock) || 0),
          rangeAllocations,
          counterpartyName: draft.counterparty.name,
          counterpartyAddress: draft.counterparty.address,
        }
      : null;
  const planInputKey = planInput ? JSON.stringify(planInput) : null;
  // 生成したときの入力と今の入力が一致する間だけ計画を使い、古い計画のまま印刷させない。
  const consumptionPlan = useMemo(
    () =>
      planInputKey !== null && planInputKey === draft.planInputKey
        ? buildConsumptionPlan(JSON.parse(planInputKey) as BuildConsumptionPlanInput)
        : null,
    [planInputKey, draft.planInputKey],
  );
  const isPlanOutdated = draft.planInputKey !== null && consumptionPlan === null;

  const missingFields = findMissingApplicationFields({
    values: { ...draft, homeStock },
    selectedGunCount: selectedGuns.length,
    hasCounterparty: draft.counterparty !== null,
    planStatus:
      consumptionPlan && consumptionPlan.rows.length > 0
        ? "ready"
        : isPlanOutdated
          ? "outdated"
          : "missing",
  });
  // 一度印刷を試みた後は、入力に合わせて一覧を減らしていく。
  const shownMissingFields = isMissingFieldsShown ? missingFields : [];
  const invalidFieldIds = new Set(shownMissingFields.map((field) => field.fieldId));

  function requiredInputProps(key: RequiredApplicationFieldKey) {
    const { id } = requiredApplicationFields[key];
    return { id, required: true, "aria-invalid": invalidFieldIds.has(id) || undefined };
  }

  function focusField({ fieldId }: { fieldId: string }) {
    const element = document.getElementById(fieldId);
    element?.scrollIntoView?.({ block: "center" });
    element?.focus({ preventScroll: true });
  }

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
    setError(null);
    setIsMissingFieldsShown(false);
    setIsResetConfirmOpen(false);
  }

  function handleGeneratePlan() {
    setError(null);

    if (rangeAllocations.length === 0) {
      setError("消費計画用の射撃場を選んでください");
      return;
    }

    if (!draft.counterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    updateDraft({ planInputKey });
  }

  function handleGoToPrint() {
    setError(null);

    if (missingFields.length > 0) {
      setIsMissingFieldsShown(true);
      focusField({ fieldId: missingFields[0].fieldId });
      return;
    }

    if (consumptionPlan && consumptionPlan.warnings.length > 0) {
      setIsPlanWarningConfirmOpen(true);
      return;
    }

    goToPrint();
  }

  function goToPrint() {
    if (!consumptionPlan || !draft.counterparty) {
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
      currentHomeStock: Number(homeStock) || 0,
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
            <RequiredFieldLabel field={requiredApplicationFields.prefectureName} />
            <Input
              {...requiredInputProps("prefectureName")}
              value={draft.prefectureName}
              onChange={(event) => updateDraft({ prefectureName: event.target.value })}
              placeholder="茨城県"
            />
            <p className="text-xs text-muted-foreground">
              「○○公安委員会殿」の ○○ 部分。例: 茨城県、北海道
            </p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredFieldLabel field={requiredApplicationFields.applicationDate} />
            <IsoDateInput
              {...requiredInputProps("applicationDate")}
              value={draft.applicationDate}
              onChange={({ value }) => updateDraft({ applicationDate: value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredFieldLabel field={requiredApplicationFields.ownerName} />
            <Input
              {...requiredInputProps("ownerName")}
              value={draft.ownerName}
              onChange={(event) => updateDraft({ ownerName: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredFieldLabel field={requiredApplicationFields.ownerFurigana} />
            <Input
              {...requiredInputProps("ownerFurigana")}
              value={draft.ownerFurigana}
              onChange={(event) => updateDraft({ ownerFurigana: event.target.value })}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <RequiredFieldLabel field={requiredApplicationFields.ownerAddress} />
            <Input
              {...requiredInputProps("ownerAddress")}
              value={draft.ownerAddress}
              onChange={(event) => updateDraft({ ownerAddress: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <RequiredFieldLabel field={requiredApplicationFields.ownerBirthDate} />
            <IsoDateInput
              {...requiredInputProps("ownerBirthDate")}
              value={draft.ownerBirthDate}
              onChange={({ value }) => updateDraft({ ownerBirthDate: value })}
            />
          </div>
          <div className="space-y-2">
            <RequiredFieldLabel field={requiredApplicationFields.ownerPhone} />
            <Input
              {...requiredInputProps("ownerPhone")}
              value={draft.ownerPhone}
              onChange={(event) => updateDraft({ ownerPhone: event.target.value })}
            />
          </div>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="許可内容">
        <div className="space-y-4">
          <FieldSelect
            id={requiredApplicationFields.ammoName.id}
            label={requiredApplicationFields.ammoName.label}
            labelSuffix={<RequiredMark />}
            value={draft.ammoName}
            // 空の選択肢を選んでも既定値を保ち、下書きとして読み戻せない値を残さない。
            onChange={(value) => value && updateDraft({ ammoName: value as ApplicationAmmoName })}
            options={applicationAmmoNameOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            required
            placeholder=""
          />

          <FieldSelect
            id={requiredApplicationFields.permitPurpose.id}
            label={requiredApplicationFields.permitPurpose.label}
            labelSuffix={<RequiredMark />}
            value={draft.permitPurpose}
            onChange={(value) =>
              value && updateDraft({ permitPurpose: value as AcquisitionPermitPurpose })
            }
            options={acquisitionPermitPurposeOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            required
            placeholder=""
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredFieldLabel field={requiredApplicationFields.requestedQuantity} />
              <Input
                {...requiredInputProps("requestedQuantity")}
                type="number"
                min={250}
                step={250}
                value={draft.requestedQuantity}
                onChange={(event) => updateDraft({ requestedQuantity: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <RequiredFieldLabel field={requiredApplicationFields.homeStock} />
              <Input
                {...requiredInputProps("homeStock")}
                type="number"
                min={0}
                value={homeStock}
                onChange={(event) => updateDraft({ homeStockOverride: event.target.value })}
                aria-describedby="home-stock-help"
              />
              <p id="home-stock-help" className="text-xs text-muted-foreground">
                初期値は、帳簿の在庫のうち選んだ名称に当たる弾種の合計です。
                {otherHomeStock > 0
                  ? `自宅保管の上限（${homeStorageRoundLimit}発）の確認には、ほかの弾種の${otherHomeStock.toLocaleString("ja-JP")}発も含めます。`
                  : null}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <RequiredFieldLabel field={requiredApplicationFields.validFrom} />
              <IsoDateInput
                {...requiredInputProps("validFrom")}
                value={draft.validFrom}
                onChange={({ value }) => handleValidFromChange(value)}
              />
            </div>
            <div className="space-y-2">
              <RequiredFieldLabel field={requiredApplicationFields.validTo} />
              <IsoDateInput
                {...requiredInputProps("validTo")}
                value={draft.validTo}
                min={draft.validFrom}
                onChange={({ value }) => updateDraft({ validTo: value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <RequiredFieldLabel field={requiredApplicationFields.storageLocation} />
            <Input
              {...requiredInputProps("storageLocation")}
              value={draft.storageLocation}
              onChange={(event) => updateDraft({ storageLocation: event.target.value })}
            />
          </div>

          <div className="space-y-2">
            <RequiredFieldLabel
              field={requiredApplicationFields.possessionPermitCertificateNumber}
            />
            <Input
              {...requiredInputProps("possessionPermitCertificateNumber")}
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

      <AmmoLedgerPanel title="使用銃" description="1丁以上選んでください（必須）">
        {guns.length === 0 ? (
          <p
            id={selectedGunsFieldId}
            tabIndex={-1}
            className="text-sm text-muted-foreground outline-none"
          >
            銃が未登録です。
            <Link href="/lab/ammo-ledger/settings/guns" className="underline">
              銃を登録
            </Link>
          </p>
        ) : (
          <ul id={selectedGunsFieldId} tabIndex={-1} className="space-y-2 text-sm outline-none">
            {guns.map((gun) => (
              <li key={gun.id}>
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={draft.selectedGunIds.includes(gun.id)}
                    onChange={() => toggleGunId({ gunId: gun.id })}
                  />
                  <span>
                    {gun.name}（{gun.gunType} / {gun.caliber} / 許可番号 {gun.permitNumber}）
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="譲渡者（購入先）" description="別紙の購入先として記載します（必須）">
        <MasterPicker
          id={counterpartyFieldId}
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

          <Button
            id={generatePlanFieldId}
            type="button"
            variant="outline"
            onClick={handleGeneratePlan}
          >
            消費計画を生成
          </Button>

          {isPlanOutdated ? (
            <p role="status" className="text-sm text-amber-700 dark:text-amber-300">
              入力が変わったので計画を作り直してください
            </p>
          ) : null}

          <ConsumptionPlanPreview plan={consumptionPlan} />
        </div>
      </AmmoLedgerPanel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {shownMissingFields.length > 0 ? (
        <div
          role="alert"
          className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
        >
          <p className="font-medium text-destructive">印刷の前に、次の項目を入力してください</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {shownMissingFields.map((field) => (
              <li key={field.fieldId}>
                <button
                  type="button"
                  className="text-left underline underline-offset-2"
                  onClick={() => focusField({ fieldId: field.fieldId })}
                >
                  {field.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

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

      <Dialog open={isPlanWarningConfirmOpen} onOpenChange={setIsPlanWarningConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>消費計画に注意があります</DialogTitle>
            <DialogDescription>
              次の点が残ったまま別紙を作ります。内容を確かめてから印刷へ進んでください。
            </DialogDescription>
          </DialogHeader>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {consumptionPlan?.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsPlanWarningConfirmOpen(false)}
            >
              計画を見直す
            </Button>
            <Button type="button" onClick={goToPrint}>
              このまま印刷へ進む
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun } from "@/db/schema/ammo-ledger";
import type { AcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/acquisition-permit-application-types";
import { saveAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import { ConsumptionPlanPreview } from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-preview/consumption-plan-preview";
import {
  buildRangeAllocationsFromRows,
  ConsumptionPlanRangeAllocationList,
  createInitialRangeAllocationRows,
  type RangeAllocationRowState,
} from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-range-allocation-list/consumption-plan-range-allocation-list";
import { buildConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/build-consumption-plan/build-consumption-plan";
import type { ConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/consumption-plan-types";
import type {
  MasterPickerData,
  PickerMasterEntry,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { useMasterPickerData } from "@/features/ammo-ledger/catalog/use-master-picker-data/use-master-picker-data";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PurposeSelect } from "@/features/ammo-ledger/components/purpose-select/purpose-select";
import {
  type AcquisitionPermitName,
  acquisitionPermitNameOptions,
  defaultAcquisitionPermitName,
} from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import {
  type AcquisitionPermitPurpose,
  acquisitionPermitPurposeOptions,
  defaultAcquisitionPermitPurpose,
} from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { cn } from "@/lib/cn";

type AcquisitionPermitApplicationFormProps = {
  ownerName: string;
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
  ownerAddress,
  ownerBirthDate = "",
  ownerPhone = "",
  currentHomeStock,
  guns,
}: AcquisitionPermitApplicationFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const { pickerData: rangePickerData } = useMasterPickerData({
    catalogKind: "range",
    enabled: true,
  });
  const { pickerData: counterpartyPickerData } = useMasterPickerData({
    catalogKind: "gun_shop",
    enabled: true,
  });
  const defaultsApplied = useRef(false);

  const [prefectureName, setPrefectureName] = useState("茨城県");
  const [applicationDate, setApplicationDate] = useState(today);
  const [name, setName] = useState(ownerName);
  const [furigana, setFurigana] = useState("");
  const [address, setAddress] = useState(ownerAddress);
  const [birthDate, setBirthDate] = useState(ownerBirthDate);
  const [phone, setPhone] = useState(ownerPhone);
  const [possessionPermitCertificateNumber, setPossessionPermitCertificateNumber] = useState("");
  const [ledgerPurpose, setLedgerPurpose] = useState<LedgerPurpose>("shooting");
  const [ammoName, setAmmoName] = useState<AcquisitionPermitName>(defaultAcquisitionPermitName);
  const [permitPurpose, setPermitPurpose] = useState(defaultAcquisitionPermitPurpose);
  const [requestedQuantity, setRequestedQuantity] = useState("5000");
  const [homeStock, setHomeStock] = useState(String(currentHomeStock));
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(defaultValidTo({ validFrom: today }));
  const [storageLocation, setStorageLocation] = useState("自宅装弾ロッカー");
  const [selectedGunIds, setSelectedGunIds] = useState<string[]>(
    guns.length > 0 ? [guns[0].id] : [],
  );
  const [counterpartyId, setCounterpartyId] = useState("");
  const [selectedCounterparty, setSelectedCounterparty] = useState<PickerMasterEntry | null>(null);
  const [rangeAllocationRows, setRangeAllocationRows] = useState<RangeAllocationRowState[]>([]);

  useEffect(() => {
    if (!counterpartyPickerData || !rangePickerData || defaultsApplied.current) {
      return;
    }

    const initialCounterpartyId =
      counterpartyPickerData.recent[0]?.id ?? counterpartyPickerData.registered[0]?.id ?? "";
    setCounterpartyId(initialCounterpartyId);
    setSelectedCounterparty(
      findPickerMaster({
        masterId: initialCounterpartyId,
        pickerData: counterpartyPickerData,
      }),
    );
    setRangeAllocationRows(createInitialRangeAllocationRows({ rangePickerData }));
    defaultsApplied.current = true;
  }, [counterpartyPickerData, rangePickerData]);
  const [consumptionPlan, setConsumptionPlan] = useState<ConsumptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGuns = guns.filter((gun) => selectedGunIds.includes(gun.id));
  const gunType = selectedGuns.map((gun) => gun.gunType).join("、");
  const compatibleAmmunition = ammoName;
  const gunTypeAndCaliber = selectedGuns.map((gun) => `${gun.gunType} ${gun.caliber}`).join("、");

  function handleValidFromChange(value: string) {
    setValidFrom(value);
    setValidTo(defaultValidTo({ validFrom: value }));
  }

  function toggleGunId({ gunId }: { gunId: string }) {
    setSelectedGunIds((current) =>
      current.includes(gunId) ? current.filter((id) => id !== gunId) : [...current, gunId],
    );
  }

  function handleCounterpartyChange({ nextCounterpartyId }: { nextCounterpartyId: string }) {
    setCounterpartyId(nextCounterpartyId);
    if (!counterpartyPickerData) {
      return;
    }

    const found = findPickerMaster({
      masterId: nextCounterpartyId,
      pickerData: counterpartyPickerData,
    });
    if (found) {
      setSelectedCounterparty(found);
    }
  }

  function handleGeneratePlan() {
    setError(null);
    const quantity = Number(requestedQuantity) || 0;
    const rangeAllocations = buildRangeAllocationsFromRows({
      rows: rangeAllocationRows,
      permitPurpose,
    });

    if (rangeAllocations.length === 0) {
      setError("消費計画用の射撃場を選んでください");
      return;
    }

    if (!selectedCounterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const plan = buildConsumptionPlan({
      requestedQuantity: quantity,
      periodFrom: validFrom,
      periodTo: validTo,
      currentHomeStock: Number(homeStock) || 0,
      rangeAllocations,
      counterpartyName: selectedCounterparty.name,
      counterpartyAddress: selectedCounterparty.address,
    });

    setConsumptionPlan(plan);
  }

  function handleGoToPrint() {
    setError(null);

    if (!consumptionPlan || consumptionPlan.rows.length === 0) {
      setError("先に消費計画を生成してください");
      return;
    }

    if (!selectedCounterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const payload: AcquisitionPermitApplicationPayload = {
      prefectureName,
      applicationDate,
      ownerName: name,
      ownerFurigana: furigana || undefined,
      ownerAddress: address,
      ownerBirthDate: birthDate || undefined,
      ownerPhone: phone || undefined,
      ammoName,
      requestedQuantity: Number(requestedQuantity) || 0,
      currentHomeStock: Number(homeStock) || 0,
      gunType,
      compatibleAmmunition,
      possessionPermitCertificateNumber: possessionPermitCertificateNumber.trim() || undefined,
      gunTypeAndCaliber,
      permitPurpose,
      ledgerPurpose,
      validFrom,
      validTo,
      storageLocation,
      counterpartyName: selectedCounterparty.name,
      counterpartyAddress: selectedCounterparty.address,
      consumptionPlan,
    };

    saveAcquisitionPermitApplicationPayload({ payload });
    router.push("/lab/ammo-ledger/applications/acquisition-permit/print");
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
              value={prefectureName}
              onChange={(event) => setPrefectureName(event.target.value)}
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
              value={applicationDate}
              onChange={({ value }) => setApplicationDate(value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-name">氏名</Label>
            <Input id="owner-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-furigana">ふりがな</Label>
            <Input
              id="owner-furigana"
              value={furigana}
              onChange={(event) => setFurigana(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="owner-address">住所</Label>
            <Input
              id="owner-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-birth-date">生年月日</Label>
            <IsoDateInput
              id="owner-birth-date"
              value={birthDate}
              onChange={({ value }) => setBirthDate(value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="owner-phone">電話番号</Label>
            <Input
              id="owner-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="許可内容">
        <div className="space-y-4">
          <PurposeSelect value={ledgerPurpose} onChange={setLedgerPurpose} />

          <FieldSelect
            id="ammo-name"
            label="火薬類の名称"
            value={ammoName}
            onChange={(value) => setAmmoName(value as AcquisitionPermitName)}
            options={acquisitionPermitNameOptions.map((option) => ({
              value: option,
              label: option,
            }))}
            required
            placeholder=""
          />

          <FieldSelect
            id="permit-purpose"
            label="譲受の目的"
            value={permitPurpose}
            onChange={(value) => setPermitPurpose(value as AcquisitionPermitPurpose)}
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
                value={requestedQuantity}
                onChange={(event) => setRequestedQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="home-stock">現保有数量（発）</Label>
              <Input
                id="home-stock"
                type="number"
                min={0}
                value={homeStock}
                onChange={(event) => setHomeStock(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="valid-from">譲受期間（開始）</Label>
              <IsoDateInput
                id="valid-from"
                value={validFrom}
                onChange={({ value }) => handleValidFromChange(value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-to">譲受期間（終了）</Label>
              <IsoDateInput
                id="valid-to"
                value={validTo}
                min={validFrom}
                onChange={({ value }) => setValidTo(value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="storage-location">貯蔵又は保管する場所</Label>
            <Input
              id="storage-location"
              value={storageLocation}
              onChange={(event) => setStorageLocation(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="possession-permit-certificate-number">銃砲所持許可証の番号</Label>
            <Input
              id="possession-permit-certificate-number"
              value={possessionPermitCertificateNumber}
              onChange={(event) => setPossessionPermitCertificateNumber(event.target.value)}
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
                    checked={selectedGunIds.includes(gun.id)}
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
          value={counterpartyId}
          onChange={(nextCounterpartyId) => handleCounterpartyChange({ nextCounterpartyId })}
          onMasterSelect={setSelectedCounterparty}
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
            rows={rangeAllocationRows}
            onRowsChange={setRangeAllocationRows}
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
        <Button type="button" onClick={handleGoToPrint}>
          印刷プレビューへ
        </Button>
      </div>
    </div>
  );
}

function findPickerMaster({
  masterId,
  pickerData,
}: {
  masterId: string;
  pickerData: MasterPickerData;
}): PickerMasterEntry | null {
  if (!masterId) {
    return null;
  }

  return (
    pickerData.recent.find((item) => item.id === masterId) ??
    pickerData.registered.find((item) => item.id === masterId) ??
    null
  );
}

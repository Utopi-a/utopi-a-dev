"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ammoGun } from "@/db/schema/ammo-ledger";
import type { AcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/acquisition-permit-application-types";
import { saveAcquisitionPermitApplicationPayload } from "@/features/ammo-ledger/acquisition-permit-application/application-session/application-session";
import { ConsumptionPlanPreview } from "@/features/ammo-ledger/acquisition-permit-application/components/consumption-plan-preview/consumption-plan-preview";
import { buildConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/build-consumption-plan/build-consumption-plan";
import type { ConsumptionPlan } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/consumption-plan-types";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { AmmoLedgerNav } from "@/features/ammo-ledger/components/ammo-ledger-nav/ammo-ledger-nav";
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

type RangeOption = {
  id: string;
  name: string;
  address: string;
};

type AcquisitionPermitApplicationFormProps = {
  ownerName: string;
  ownerAddress: string;
  currentHomeStock: number;
  guns: (typeof ammoGun.$inferSelect)[];
  ranges: RangeOption[];
  counterpartyPickerData: MasterPickerData;
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
  currentHomeStock,
  guns,
  ranges,
  counterpartyPickerData,
}: AcquisitionPermitApplicationFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [applicationDate, setApplicationDate] = useState(today);
  const [name, setName] = useState(ownerName);
  const [furigana, setFurigana] = useState("");
  const [address, setAddress] = useState(ownerAddress);
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [ledgerPurpose, setLedgerPurpose] = useState<LedgerPurpose>("shooting");
  const [ammoName, setAmmoName] = useState<AcquisitionPermitName>(defaultAcquisitionPermitName);
  const [permitPurpose, setPermitPurpose] = useState(defaultAcquisitionPermitPurpose);
  const [requestedQuantity, setRequestedQuantity] = useState("5000");
  const [homeStock, setHomeStock] = useState(String(currentHomeStock));
  const [validFrom, setValidFrom] = useState(today);
  const [validTo, setValidTo] = useState(defaultValidTo({ validFrom: today }));
  const [storageLocation, setStorageLocation] = useState(ownerAddress);
  const [permitCertificateNumber, setPermitCertificateNumber] = useState("");
  const [selectedGunIds, setSelectedGunIds] = useState<string[]>(
    guns.length > 0 ? [guns[0].id] : [],
  );
  const [counterpartyId, setCounterpartyId] = useState(
    counterpartyPickerData.recent[0]?.id ?? counterpartyPickerData.registered[0]?.id ?? "",
  );
  const [primaryRangeId, setPrimaryRangeId] = useState(ranges[0]?.id ?? "");
  const [secondaryRangeId, setSecondaryRangeId] = useState(ranges[1]?.id ?? "");
  const [primaryRangeWeight, setPrimaryRangeWeight] = useState("2");
  const [secondaryRangeWeight, setSecondaryRangeWeight] = useState("1");
  const [consumptionPlan, setConsumptionPlan] = useState<ConsumptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedGuns = guns.filter((gun) => selectedGunIds.includes(gun.id));
  const gunTypeAndCaliber = selectedGuns.map((gun) => `${gun.gunType} ${gun.caliber}`).join("、");

  const counterparty = useMemo(() => {
    const registered = counterpartyPickerData.registered.find((item) => item.id === counterpartyId);
    if (registered) {
      return registered;
    }
    return counterpartyPickerData.recent.find((item) => item.id === counterpartyId) ?? null;
  }, [counterpartyId, counterpartyPickerData]);

  function handleValidFromChange(value: string) {
    setValidFrom(value);
    setValidTo(defaultValidTo({ validFrom: value }));
  }

  function toggleGunId({ gunId }: { gunId: string }) {
    setSelectedGunIds((current) =>
      current.includes(gunId) ? current.filter((id) => id !== gunId) : [...current, gunId],
    );
  }

  function handleGeneratePlan() {
    setError(null);
    const quantity = Number(requestedQuantity) || 0;
    const rangeAllocations = buildRangeAllocations({
      ranges,
      primaryRangeId,
      secondaryRangeId,
      primaryRangeWeight: Number(primaryRangeWeight) || 1,
      secondaryRangeWeight: Number(secondaryRangeWeight) || 0,
      permitPurpose,
    });

    if (rangeAllocations.length === 0) {
      setError("消費計画用の射撃場を選んでください");
      return;
    }

    if (!counterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const plan = buildConsumptionPlan({
      requestedQuantity: quantity,
      periodFrom: validFrom,
      periodTo: validTo,
      currentHomeStock: Number(homeStock) || 0,
      rangeAllocations,
      counterpartyName: counterparty.name,
      counterpartyAddress: counterparty.address,
    });

    setConsumptionPlan(plan);
  }

  function handleGoToPrint() {
    setError(null);

    if (!consumptionPlan || consumptionPlan.rows.length === 0) {
      setError("先に消費計画を生成してください");
      return;
    }

    if (!counterparty) {
      setError("譲渡者（購入先）を選んでください");
      return;
    }

    const payload: AcquisitionPermitApplicationPayload = {
      applicationDate,
      ownerName: name,
      ownerFurigana: furigana || undefined,
      ownerAddress: address,
      ownerBirthDate: birthDate || undefined,
      ownerPhone: phone || undefined,
      ammoName,
      requestedQuantity: Number(requestedQuantity) || 0,
      currentHomeStock: Number(homeStock) || 0,
      gunTypeAndCaliber,
      permitCertificateNumber: permitCertificateNumber || undefined,
      permitPurpose,
      ledgerPurpose,
      validFrom,
      validTo,
      storageLocation,
      counterpartyName: counterparty.name,
      counterpartyAddress: counterparty.address,
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
          別記様式第2号（茨城県警・令和7年3月改定）に入力値を重ねて印刷します。
        </p>
      </div>

      <AmmoLedgerNav />

      <AmmoLedgerPanel title="申請者">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="application-date">申請日</Label>
            <Input
              id="application-date"
              type="date"
              value={applicationDate}
              onChange={(event) => setApplicationDate(event.target.value)}
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
            <Input
              id="owner-birth-date"
              type="date"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
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
                min={25}
                step={25}
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
              <Input
                id="valid-from"
                type="date"
                value={validFrom}
                onChange={(event) => handleValidFromChange(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valid-to">譲受期間（終了）</Label>
              <Input
                id="valid-to"
                type="date"
                value={validTo}
                min={validFrom}
                onChange={(event) => setValidTo(event.target.value)}
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
            <Label htmlFor="permit-certificate-number">許可証等の番号</Label>
            <Input
              id="permit-certificate-number"
              value={permitCertificateNumber}
              onChange={(event) => setPermitCertificateNumber(event.target.value)}
              placeholder="銃の所持許可証 第○○号 など"
            />
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
          onChange={setCounterpartyId}
          catalogKind="gun_shop"
          pickerData={counterpartyPickerData}
          sheetTitle="購入先を選ぶ"
          required
        />
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="消費（購入）計画">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            購入は250発単位、消費は25発単位で期間内に振り分けます。自宅保管は800発を超えないよう調整します。
          </p>

          {ranges.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              射撃場が未登録です。
              <Link href="/lab/ammo-ledger/settings/ranges" className="underline">
                射撃場を登録
              </Link>
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSelect
                id="primary-range"
                label="射撃場（主）"
                value={primaryRangeId}
                onChange={setPrimaryRangeId}
                options={ranges.map((range) => ({ value: range.id, label: range.name }))}
                required
                placeholder=""
              />
              <div className="space-y-2">
                <Label htmlFor="primary-range-weight">配分 weight</Label>
                <Input
                  id="primary-range-weight"
                  type="number"
                  min={1}
                  value={primaryRangeWeight}
                  onChange={(event) => setPrimaryRangeWeight(event.target.value)}
                />
              </div>
              <FieldSelect
                id="secondary-range"
                label="射撃場（副）"
                value={secondaryRangeId}
                onChange={setSecondaryRangeId}
                options={[
                  { value: "", label: "なし" },
                  ...ranges.map((range) => ({ value: range.id, label: range.name })),
                ]}
                placeholder=""
              />
              <div className="space-y-2">
                <Label htmlFor="secondary-range-weight">配分 weight</Label>
                <Input
                  id="secondary-range-weight"
                  type="number"
                  min={0}
                  value={secondaryRangeWeight}
                  onChange={(event) => setSecondaryRangeWeight(event.target.value)}
                  disabled={!secondaryRangeId}
                />
              </div>
            </div>
          )}

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

function buildRangeAllocations({
  ranges,
  primaryRangeId,
  secondaryRangeId,
  primaryRangeWeight,
  secondaryRangeWeight,
  permitPurpose,
}: {
  ranges: RangeOption[];
  primaryRangeId: string;
  secondaryRangeId: string;
  primaryRangeWeight: number;
  secondaryRangeWeight: number;
  permitPurpose: AcquisitionPermitPurpose;
}) {
  const allocations = [];

  const primary = ranges.find((range) => range.id === primaryRangeId);
  if (primary && primaryRangeWeight > 0) {
    allocations.push({
      rangeId: primary.id,
      rangeName: primary.name,
      rangeAddress: primary.address,
      purpose: permitPurpose,
      weight: primaryRangeWeight,
    });
  }

  const secondary = ranges.find((range) => range.id === secondaryRangeId);
  if (secondary && secondaryRangeId && secondaryRangeWeight > 0) {
    allocations.push({
      rangeId: secondary.id,
      rangeName: secondary.name,
      rangeAddress: secondary.address,
      purpose: permitPurpose,
      weight: secondaryRangeWeight,
    });
  }

  return allocations;
}

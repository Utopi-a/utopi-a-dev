"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun } from "@/db/schema/ammo-ledger";
import { AmmoLedgerPanel } from "@/features/ammo-ledger/components/ammo-ledger-panel/ammo-ledger-panel";
import { cn } from "@/lib/cn";
import { saveGunPermitApplicationPayload } from "../../application-session/application-session";
import type {
  CohabitantEntry,
  GunApplicationGunEntry,
  GunPermitApplicationKind,
  GunPermitApplicationPayload,
  GunPermitGunCategory,
  GunPermitPurpose,
  ResumeAddressEntry,
  ResumeWorkEntry,
} from "../../gun-possession-permit-application-types";
import { buildRequiredDocuments } from "../../required-documents/build-required-documents/build-required-documents";
import { RequiredDocumentsChecklist } from "../required-documents-checklist/required-documents-checklist";

type GunPermitApplicationFormProps = {
  ownerName: string;
  ownerAddress: string;
  ownerBirthDate?: string;
  ownerPhone?: string;
  guns: (typeof ammoGun.$inferSelect)[];
};

const kindOptions: Array<{ value: GunPermitApplicationKind; label: string }> = [
  { value: "new", label: "新規（初めて所持）" },
  { value: "addition", label: "追加（2本目以降）" },
  { value: "renewal", label: "更新" },
];

const purposeOptions: Array<{ value: GunPermitPurpose; label: string }> = [
  { value: "hunting", label: "狩猟" },
  { value: "harmful_bird_beast", label: "有害鳥獣駆除" },
  { value: "target_shooting", label: "標的射撃" },
  { value: "other", label: "その他" },
];

type GunEntryDraft = GunApplicationGunEntry & { entryId: string };
type WorkHistoryDraft = ResumeWorkEntry & { rowId: string };
type AddressHistoryDraft = ResumeAddressEntry & { rowId: string };
type CohabitantDraft = CohabitantEntry & { rowId: string };

function createEmptyGunEntry(): GunEntryDraft {
  return {
    entryId: crypto.randomUUID(),
    gunCategory: "shotgun",
    gunType: "散弾銃",
    model: "",
    gunNumber: "",
    purpose: "hunting",
  };
}

function gunToEntry({ gun }: { gun: typeof ammoGun.$inferSelect }): GunEntryDraft {
  return {
    entryId: crypto.randomUUID(),
    gunCategory: "shotgun",
    gunType: gun.gunType,
    model: gun.name,
    gunNumber: gun.gunNumber,
    caliber: gun.caliber,
    purpose: (gun.purpose as GunPermitPurpose) || "hunting",
    permitNumber: gun.permitNumber,
  };
}

export function GunPermitApplicationForm({
  ownerName,
  ownerAddress,
  ownerBirthDate = "",
  ownerPhone = "",
  guns: registeredGuns,
}: GunPermitApplicationFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const [kind, setKind] = useState<GunPermitApplicationKind>("new");
  const [prefectureName, setPrefectureName] = useState("北海道");
  const [applicationDate, setApplicationDate] = useState(today);
  const [name, setName] = useState(ownerName);
  const [furigana, setFurigana] = useState("");
  const [registeredDomicile, setRegisteredDomicile] = useState("");
  const [address, setAddress] = useState(ownerAddress);
  const [birthDate, setBirthDate] = useState(ownerBirthDate);
  const [phone, setPhone] = useState(ownerPhone);
  const [hasExistingPermit, setHasExistingPermit] = useState(registeredGuns.length > 0);
  const [existingPermitSubmittedToSamePrefecture, setExistingPermitSubmittedToSamePrefecture] =
    useState(true);
  const [issuesNewPermitCard, setIssuesNewPermitCard] = useState(true);
  const [isAge75OrOlder, setIsAge75OrOlder] = useState(false);
  const [hasCohabitants, setHasCohabitants] = useState(false);
  const [cohabitantCount, setCohabitantCount] = useState("0");
  const [omitCohabitantForm, setOmitCohabitantForm] = useState(false);
  const [omitResidentRecord, setOmitResidentRecord] = useState(false);
  const [omitResume, setOmitResume] = useState(false);
  const [pledgeDisqualification, setPledgeDisqualification] = useState(true);
  const [pledgeHuntingDisqualification, setPledgeHuntingDisqualification] = useState(true);
  const [gunEntries, setGunEntries] = useState<GunEntryDraft[]>([createEmptyGunEntry()]);
  const [workHistory, setWorkHistory] = useState<WorkHistoryDraft[]>([
    { rowId: crypto.randomUUID(), from: "", to: "", employer: "" },
  ]);
  const [addressHistory, setAddressHistory] = useState<AddressHistoryDraft[]>([
    { rowId: crypto.randomUUID(), from: "", to: "", address: ownerAddress },
  ]);
  const [hasCriminalRecord, setHasCriminalRecord] = useState(false);
  const [hasTreatmentHistory, setHasTreatmentHistory] = useState(false);
  const [cohabitants, setCohabitants] = useState<CohabitantDraft[]>([]);
  const [error, setError] = useState<string | null>(null);

  const requiredDocuments = useMemo(
    () =>
      buildRequiredDocuments({
        input: {
          kind,
          hasExistingPermit,
          existingPermitSubmittedToSamePrefecture,
          issuesNewPermitCard,
          isAge75OrOlder,
          omitCohabitantForm,
          omitResidentRecord,
          omitResume,
        },
      }),
    [
      kind,
      hasExistingPermit,
      existingPermitSubmittedToSamePrefecture,
      issuesNewPermitCard,
      isAge75OrOlder,
      omitCohabitantForm,
      omitResidentRecord,
      omitResume,
    ],
  );

  function updateGunEntry({
    index,
    patch,
  }: {
    index: number;
    patch: Partial<GunApplicationGunEntry>;
  }) {
    setGunEntries((current) =>
      current.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, ...patch, entryId: entry.entryId } : entry,
      ),
    );
  }

  function addGunEntry() {
    setGunEntries((current) => [...current, createEmptyGunEntry()]);
  }

  function removeGunEntry({ index }: { index: number }) {
    setGunEntries((current) => current.filter((_, entryIndex) => entryIndex !== index));
  }

  function prefillFromRegisteredGun({ gunId }: { gunId: string }) {
    const gun = registeredGuns.find((entry) => entry.id === gunId);
    if (!gun) {
      return;
    }
    setGunEntries((current) => [...current, gunToEntry({ gun })]);
  }

  function handleSubmit() {
    if (!prefectureName.trim()) {
      setError("提出先の都道府県名を入力してください。");
      return;
    }
    if (!name.trim() || !address.trim()) {
      setError("氏名と住所は必須です。");
      return;
    }
    if (gunEntries.length === 0) {
      setError("申請銃を1件以上入力してください。");
      return;
    }

    const payload: GunPermitApplicationPayload = {
      kind,
      prefectureName: prefectureName.trim(),
      applicationDate,
      ownerName: name.trim(),
      ownerFurigana: furigana.trim() || undefined,
      ownerRegisteredDomicile: registeredDomicile.trim() || undefined,
      ownerAddress: address.trim(),
      ownerBirthDate: birthDate || undefined,
      ownerPhone: phone.trim() || undefined,
      applicationCount: gunEntries.length,
      guns: gunEntries.map(({ entryId: _entryId, ...gun }) => gun),
      hasExistingPermit,
      existingPermitSubmittedToSamePrefecture,
      issuesNewPermitCard,
      isAge75OrOlder,
      hasCohabitants,
      cohabitantCount: hasCohabitants ? Number(cohabitantCount) : undefined,
      omitCohabitantForm,
      omitResidentRecord,
      omitResume,
      pledgeDisqualification,
      pledgeHuntingDisqualification,
      resume: {
        workHistory: workHistory
          .filter((entry) => entry.employer.trim())
          .map(({ rowId: _rowId, ...entry }) => entry),
        addressHistory: addressHistory
          .filter((entry) => entry.address.trim())
          .map(({ rowId: _rowId, ...entry }) => entry),
        gunHistory: [],
        hasCriminalRecord,
        hasTreatmentHistory,
      },
      cohabitants: cohabitants
        .filter((entry) => entry.name.trim())
        .map(({ rowId: _rowId, ...entry }) => entry),
    };

    saveGunPermitApplicationPayload({ payload });
    router.push("/lab/ammo-ledger/applications/gun-possession-permit/print");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">銃所持許可申請書</h1>
        <p className="text-sm text-muted-foreground">
          別記様式第6号（新規・追加）または第9号（更新）に入力値を重ねて印刷します。提出先の都道府県名を入力してください。
        </p>
      </div>

      <AmmoLedgerPanel title="手続き種別">
        <div className="grid gap-2 sm:grid-cols-3">
          {kindOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                kind === option.value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
              )}
              onClick={() => setKind(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="申請者">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="prefectureName">提出先都道府県</Label>
            <Input
              id="prefectureName"
              value={prefectureName}
              onChange={(event) => setPrefectureName(event.target.value)}
              placeholder="例: 北海道、茨城県"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="applicationDate">申請日</Label>
            <IsoDateInput
              id="applicationDate"
              value={applicationDate}
              onChange={({ value }) => setApplicationDate(value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="registeredDomicile">本籍</Label>
            <Input
              id="registeredDomicile"
              value={registeredDomicile}
              onChange={(event) => setRegisteredDomicile(event.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="furigana">ふりがな</Label>
            <Input
              id="furigana"
              value={furigana}
              onChange={(event) => setFurigana(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="name">氏名</Label>
            <Input id="name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="birthDate">生年月日</Label>
            <IsoDateInput
              id="birthDate"
              value={birthDate}
              onChange={({ value }) => setBirthDate(value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">電話番号</Label>
            <Input id="phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
          </div>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="申請条件">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasExistingPermit}
              onChange={(event) => setHasExistingPermit(event.target.checked)}
            />
            既に所持許可を受けている
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={existingPermitSubmittedToSamePrefecture}
              onChange={(event) => setExistingPermitSubmittedToSamePrefecture(event.target.checked)}
              disabled={!hasExistingPermit}
            />
            同一公安委員会に過去申請済み
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={issuesNewPermitCard}
              onChange={(event) => setIssuesNewPermitCard(event.target.checked)}
            />
            新たな許可証の交付がある
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isAge75OrOlder}
              onChange={(event) => setIsAge75OrOlder(event.target.checked)}
            />
            申請日時点で75歳以上
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={hasCohabitants}
              onChange={(event) => {
                const checked = event.target.checked;
                setHasCohabitants(checked);
                if (checked && cohabitants.length === 0) {
                  setCohabitants([{ rowId: crypto.randomUUID(), name: "", relationship: "" }]);
                }
              }}
            />
            同居人がいる
          </label>
          {hasCohabitants ? (
            <div className="space-y-2">
              <Label htmlFor="cohabitantCount">同居人数</Label>
              <Input
                id="cohabitantCount"
                value={cohabitantCount}
                onChange={(event) => setCohabitantCount(event.target.value)}
              />
            </div>
          ) : null}
        </div>

        {kind !== "new" && hasExistingPermit ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={omitCohabitantForm}
                onChange={(event) => setOmitCohabitantForm(event.target.checked)}
              />
              同居親族書を省略
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={omitResidentRecord}
                onChange={(event) => setOmitResidentRecord(event.target.checked)}
              />
              住民票を省略
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={omitResume}
                onChange={(event) => setOmitResume(event.target.checked)}
              />
              経歴書を省略
            </label>
          </div>
        ) : null}
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="申請銃">
        {registeredGuns.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {registeredGuns.map((gun) => (
              <Button
                key={gun.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => prefillFromRegisteredGun({ gunId: gun.id })}
              >
                {gun.name} を追加
              </Button>
            ))}
          </div>
        ) : null}

        <div className="space-y-4">
          {gunEntries.map((gun, index) => (
            <div key={gun.entryId} className="rounded-lg border border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-medium">申請銃 {index + 1}</h3>
                {gunEntries.length > 1 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => removeGunEntry({ index })}
                  >
                    削除
                  </Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>銃種区分</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={gun.gunCategory}
                    onChange={(event) =>
                      updateGunEntry({
                        index,
                        patch: { gunCategory: event.target.value as GunPermitGunCategory },
                      })
                    }
                  >
                    <option value="rifle">ライフル銃</option>
                    <option value="shotgun">散弾銃</option>
                    <option value="hunting_rifle_other">ライフル銃・散弾銃以外の猟銃</option>
                    <option value="air_rifle">空気銃</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>用途</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    value={gun.purpose}
                    onChange={(event) =>
                      updateGunEntry({
                        index,
                        patch: { purpose: event.target.value as GunPermitPurpose },
                      })
                    }
                  >
                    {purposeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>種類</Label>
                  <Input
                    value={gun.gunType}
                    onChange={(event) =>
                      updateGunEntry({ index, patch: { gunType: event.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>型式</Label>
                  <Input
                    value={gun.model}
                    onChange={(event) =>
                      updateGunEntry({ index, patch: { model: event.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>銃番号</Label>
                  <Input
                    value={gun.gunNumber}
                    onChange={(event) =>
                      updateGunEntry({ index, patch: { gunNumber: event.target.value } })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>口径</Label>
                  <Input
                    value={gun.caliber ?? ""}
                    onChange={(event) =>
                      updateGunEntry({ index, patch: { caliber: event.target.value } })
                    }
                  />
                </div>
                {kind === "renewal" ? (
                  <>
                    <div className="space-y-2">
                      <Label>許可番号</Label>
                      <Input
                        value={gun.permitNumber ?? ""}
                        onChange={(event) =>
                          updateGunEntry({ index, patch: { permitNumber: event.target.value } })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>許可年月日</Label>
                      <IsoDateInput
                        value={gun.permitDate ?? ""}
                        onChange={({ value }) =>
                          updateGunEntry({ index, patch: { permitDate: value } })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 sm:col-span-2">
                      <Label>譲渡人住所</Label>
                      <Input
                        value={gun.transferorAddress ?? ""}
                        onChange={(event) =>
                          updateGunEntry({
                            index,
                            patch: { transferorAddress: event.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>譲渡人氏名</Label>
                      <Input
                        value={gun.transferorName ?? ""}
                        onChange={(event) =>
                          updateGunEntry({ index, patch: { transferorName: event.target.value } })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>譲渡人電話</Label>
                      <Input
                        value={gun.transferorPhone ?? ""}
                        onChange={(event) =>
                          updateGunEntry({ index, patch: { transferorPhone: event.target.value } })
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" className="mt-4" onClick={addGunEntry}>
          申請銃を追加
        </Button>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="経歴書（任意）">
        <div className="space-y-4 text-sm">
          <div className="space-y-2">
            <h3 className="font-medium">職歴</h3>
            {workHistory.map((entry, index) => (
              <div key={entry.rowId} className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="開始 YYYY-MM"
                  value={entry.from}
                  onChange={(event) =>
                    setWorkHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, from: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="終了 YYYY-MM"
                  value={entry.to}
                  onChange={(event) =>
                    setWorkHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, to: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="勤務先・職務"
                  value={entry.employer}
                  onChange={(event) =>
                    setWorkHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, employer: event.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setWorkHistory((current) => [
                  ...current,
                  { rowId: crypto.randomUUID(), from: "", to: "", employer: "" },
                ])
              }
            >
              職歴行を追加
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-medium">住所歴</h3>
            {addressHistory.map((entry, index) => (
              <div key={entry.rowId} className="grid gap-2 sm:grid-cols-3">
                <Input
                  placeholder="開始 YYYY-MM"
                  value={entry.from}
                  onChange={(event) =>
                    setAddressHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, from: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="終了 YYYY-MM"
                  value={entry.to}
                  onChange={(event) =>
                    setAddressHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, to: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="住所"
                  value={entry.address}
                  onChange={(event) =>
                    setAddressHistory((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, address: event.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setAddressHistory((current) => [
                  ...current,
                  { rowId: crypto.randomUUID(), from: "", to: "", address: "" },
                ])
              }
            >
              住所歴行を追加
            </Button>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasCriminalRecord}
                onChange={(event) => setHasCriminalRecord(event.target.checked)}
              />
              犯歴あり
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasTreatmentHistory}
                onChange={(event) => setHasTreatmentHistory(event.target.checked)}
              />
              治療歴あり
            </label>
          </div>
        </div>
      </AmmoLedgerPanel>

      {hasCohabitants ? (
        <AmmoLedgerPanel title="同居親族書（任意）">
          <div className="space-y-3">
            {cohabitants.map((entry, index) => (
              <div key={entry.rowId} className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="氏名"
                  value={entry.name}
                  onChange={(event) =>
                    setCohabitants((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, name: event.target.value } : row,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="続柄"
                  value={entry.relationship}
                  onChange={(event) =>
                    setCohabitants((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, relationship: event.target.value } : row,
                      ),
                    )
                  }
                />
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                setCohabitants((current) => [
                  ...current,
                  { rowId: crypto.randomUUID(), name: "", relationship: "" },
                ])
              }
            >
              同居親族を追加
            </Button>
          </div>
        </AmmoLedgerPanel>
      ) : null}

      <AmmoLedgerPanel title="誓約">
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pledgeDisqualification}
              onChange={(event) => setPledgeDisqualification(event.target.checked)}
            />
            法第5条欠格事由に該当しないことを誓約
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pledgeHuntingDisqualification}
              onChange={(event) => setPledgeHuntingDisqualification(event.target.checked)}
            />
            法第5条の2欠格事由に該当しないことを誓約（猟銃）
          </label>
        </div>
      </AmmoLedgerPanel>

      <AmmoLedgerPanel title="必要書類">
        <RequiredDocumentsChecklist items={requiredDocuments} />
      </AmmoLedgerPanel>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleSubmit}>
          印刷プレビューへ
        </Button>
        <Link
          href="/lab/ammo-ledger/settings/guns"
          className={cn(buttonVariants({ variant: "outline", size: "default" }))}
        >
          銃マスタを編集
        </Link>
      </div>
    </div>
  );
}

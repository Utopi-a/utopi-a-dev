"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { upsertLedgerProfileAction } from "@/features/ammo-ledger/profile/upsert-ledger-profile/upsert-ledger-profile-action";
import { useRequestAmmoLedgerWorkspaceRevalidation } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type LedgerProfileFormProps = {
  initialValues: {
    ownerName: string;
    ownerFurigana?: string | null;
    possessionPermitCertificateNumber?: string | null;
    ownerAddress?: string | null;
    ownerBirthDate?: string | null;
    ownerPhone?: string | null;
  };
  accountName: string;
};

export function LedgerProfileForm({ initialValues, accountName }: LedgerProfileFormProps) {
  const router = useRouter();
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();
  const [ownerName, setOwnerName] = useState(initialValues.ownerName);
  const [ownerFurigana, setOwnerFurigana] = useState(initialValues.ownerFurigana ?? "");
  const [possessionPermitCertificateNumber, setPossessionPermitCertificateNumber] = useState(
    initialValues.possessionPermitCertificateNumber ?? "",
  );
  const [ownerAddress, setOwnerAddress] = useState(initialValues.ownerAddress ?? "");
  const [ownerBirthDate, setOwnerBirthDate] = useState(initialValues.ownerBirthDate ?? "");
  const [ownerPhone, setOwnerPhone] = useState(initialValues.ownerPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      const result = await upsertLedgerProfileAction({
        ownerName,
        ownerFurigana: ownerFurigana || undefined,
        possessionPermitCertificateNumber: possessionPermitCertificateNumber || undefined,
        ownerAddress: ownerAddress || undefined,
        ownerBirthDate: ownerBirthDate || undefined,
        ownerPhone: ownerPhone || undefined,
      });

      if (!result.ok) {
        setError(result.error);

        return;
      }

      showAmmoLedgerToast({ action: "saved", subject: "帳簿プロフィール" });
      requestRevalidation();
      router.refresh();
    } catch {
      setError("通信に失敗しました。帳簿で保存状況を確認してから、再試行してください。");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <p className="text-sm text-muted-foreground">
        帳簿の表紙・印刷や譲受許可申請書に使う情報です。氏名を未入力のときはアカウント名（
        {accountName}）が使われます。
      </p>

      <div className="space-y-2">
        <Label htmlFor="owner-name">帳簿用氏名</Label>
        <Input
          id="owner-name"
          required
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
          placeholder={accountName}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner-furigana">ふりがな（任意）</Label>
        <Input
          id="owner-furigana"
          maxLength={100}
          value={ownerFurigana}
          onChange={(e) => setOwnerFurigana(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner-address">住所（任意）</Label>
        <Input
          id="owner-address"
          value={ownerAddress}
          onChange={(e) => setOwnerAddress(e.target.value)}
          placeholder="帳簿表紙・申請書に記載する場合"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner-birth-date">生年月日（任意）</Label>
        <IsoDateInput
          id="owner-birth-date"
          value={ownerBirthDate}
          onChange={({ value }) => setOwnerBirthDate(value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner-phone">電話番号（任意）</Label>
        <Input
          id="owner-phone"
          type="tel"
          value={ownerPhone}
          onChange={(e) => setOwnerPhone(e.target.value)}
          placeholder="09012345678"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="possession-permit-certificate-number">銃砲所持許可証の番号（任意）</Label>
        <Input
          id="possession-permit-certificate-number"
          maxLength={100}
          value={possessionPermitCertificateNumber}
          onChange={(e) => setPossessionPermitCertificateNumber(e.target.value)}
          aria-describedby="possession-permit-certificate-number-help"
        />
        <p id="possession-permit-certificate-number-help" className="text-sm text-muted-foreground">
          許可証に記載された番号を入力してください。銃ごとの許可番号とは別の番号です。
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}

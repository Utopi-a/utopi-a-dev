"use client";

import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { resolveRecordableDateRange } from "@/features/ammo-ledger/ledger/lock/resolve-recordable-date-range/resolve-recordable-date-range";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

/** 記録の日付欄。保存できない未来の日付とロック済みの期間は選べない。 */
export function LedgerEntryDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { workspace } = useAmmoLedgerWorkspace();
  const { min, max } = resolveRecordableDateRange({
    lockState: workspace?.lockState,
    today: getTokyoIsoDate(),
  });

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>日付</Label>
      <IsoDateInput
        id={id}
        required
        min={min}
        max={max}
        value={value}
        onChange={({ value: nextValue }) => onChange(nextValue)}
      />
    </div>
  );
}

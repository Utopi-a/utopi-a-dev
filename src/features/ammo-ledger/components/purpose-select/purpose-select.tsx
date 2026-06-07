"use client";

import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
} from "@/features/ammo-ledger/schema/ledger-purpose";

type PurposeSelectProps = {
  value: LedgerPurpose;
  onChange: (value: LedgerPurpose) => void;
};

export function PurposeSelect({ value, onChange }: PurposeSelectProps) {
  return (
    <FieldSelect
      id="purpose"
      label="用途区分"
      value={value}
      onChange={(next) => onChange(next as LedgerPurpose)}
      options={ledgerPurposes.map((purpose) => ({
        value: purpose,
        label: ledgerPurposeLabels[purpose],
      }))}
      required
      placeholder=""
    />
  );
}

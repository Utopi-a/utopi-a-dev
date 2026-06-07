"use client";

import { FieldSelect } from "@/features/ammo-ledger/components/field-select";

type LedgerYearSelectProps = {
  years: number[];
  value: number;
  onChange: ({ year }: { year: number }) => void;
  id?: string;
  label?: string;
  className?: string;
};

export function LedgerYearSelect({
  years,
  value,
  onChange,
  id = "ledger-year",
  label = "対象年",
  className,
}: LedgerYearSelectProps) {
  return (
    <FieldSelect
      id={id}
      label={label}
      value={String(value)}
      onChange={(nextValue) => onChange({ year: Number(nextValue) })}
      options={years.map((year) => ({
        value: String(year),
        label: `${year}年`,
      }))}
      required
      placeholder=""
      className={className}
    />
  );
}

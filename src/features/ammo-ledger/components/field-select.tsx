"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

type FieldSelectProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export function FieldSelect({
  id,
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "選択してください",
  className,
}: FieldSelectProps) {
  // 案内文のない選択で空欄を選べると、用途のない記録や「0年」になる。
  // 値がどの選択肢にも当たらないときだけは、別の選択肢が選ばれて見えないよう空欄を残す。
  const showsEmptyOption = placeholder !== "" || !options.some((option) => option.value === value);
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {showsEmptyOption ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

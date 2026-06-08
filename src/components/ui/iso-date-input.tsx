"use client";

import { CalendarIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type IsoDateInputProps = Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string;
  onChange: ({ value }: { value: string }) => void;
};

function IsoDateInput({
  id,
  value,
  onChange,
  className,
  min,
  max,
  disabled,
  required,
  ...rest
}: IsoDateInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    if (disabled) {
      return;
    }

    pickerRef.current?.showPicker?.();
  }

  return (
    <div className={cn("relative", className)}>
      <Input
        id={id}
        readOnly
        value={value ? formatIsoDateForDisplay({ value }) : ""}
        placeholder="YYYY/MM/DD"
        required={required}
        disabled={disabled}
        className="cursor-pointer pr-10 font-variant-numeric tabular-nums"
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openPicker();
          }
        }}
        {...rest}
      />
      <CalendarIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={pickerRef}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange({ value: event.target.value })}
        className="absolute inset-0 cursor-pointer opacity-0"
        aria-hidden
        tabIndex={-1}
      />
    </div>
  );
}

export { IsoDateInput };

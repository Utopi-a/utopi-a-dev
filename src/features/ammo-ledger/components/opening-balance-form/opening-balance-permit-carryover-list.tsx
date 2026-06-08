"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { defaultCarryoverExpiresOn } from "@/features/ammo-ledger/opening-balance/default-carryover-expires-on/default-carryover-expires-on";
import { mapLedgerPurposeToPermitPurpose } from "@/features/ammo-ledger/opening-balance/map-ledger-purpose-to-permit-purpose/map-ledger-purpose-to-permit-purpose";
import {
  type AcquisitionPermitName,
  acquisitionPermitNameOptions,
  defaultAcquisitionPermitName,
} from "@/features/ammo-ledger/schema/acquisition-permit-name-options";
import {
  type AcquisitionPermitPurpose,
  acquisitionPermitPurposeOptions,
} from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

export type OpeningBalancePermitCarryoverFormRow = {
  clientKey: string;
  permitId?: string;
  name: AcquisitionPermitName;
  permitPurpose: AcquisitionPermitPurpose;
  quantity: string;
  expiresOn: string;
};

type OpeningBalancePermitCarryoverListProps = {
  year: number;
  purpose: LedgerPurpose;
  rows: OpeningBalancePermitCarryoverFormRow[];
  openingDay: string;
  onChange: ({ rows }: { rows: OpeningBalancePermitCarryoverFormRow[] }) => void;
};

function createEmptyRow({
  year,
  purpose,
}: {
  year: number;
  purpose: LedgerPurpose;
}): OpeningBalancePermitCarryoverFormRow {
  return {
    clientKey: crypto.randomUUID(),
    name: defaultAcquisitionPermitName,
    permitPurpose: mapLedgerPurposeToPermitPurpose({ purpose }),
    quantity: "",
    expiresOn: defaultCarryoverExpiresOn({ year }),
  };
}

export function OpeningBalancePermitCarryoverList({
  year,
  purpose,
  rows,
  openingDay,
  onChange,
}: OpeningBalancePermitCarryoverListProps) {
  function updateRow({
    clientKey,
    patch,
  }: {
    clientKey: string;
    patch: Partial<OpeningBalancePermitCarryoverFormRow>;
  }) {
    onChange({
      rows: rows.map((row) => (row.clientKey === clientKey ? { ...row, ...patch } : row)),
    });
  }

  function removeRow({ clientKey }: { clientKey: string }) {
    onChange({ rows: rows.filter((row) => row.clientKey !== clientKey) });
  }

  function addRow() {
    onChange({ rows: [...rows, createEmptyRow({ year, purpose })] });
  }

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          譲り受け許可の繰越がなければ空のままで構いません。
        </p>
      ) : (
        rows.map((row, index) => (
          <div
            key={row.clientKey}
            className="space-y-4 rounded-lg border border-border/50 bg-muted/10 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">許可繰越 {index + 1}</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeRow({ clientKey: row.clientKey })}
              >
                <Trash2Icon className="size-4" />
                削除
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldSelect
                id={`permit-name-${row.clientKey}`}
                label="名称"
                value={row.name}
                onChange={(value) =>
                  updateRow({
                    clientKey: row.clientKey,
                    patch: { name: value as AcquisitionPermitName },
                  })
                }
                options={acquisitionPermitNameOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                required
                placeholder=""
              />

              <FieldSelect
                id={`permit-purpose-${row.clientKey}`}
                label="譲受の目的"
                value={row.permitPurpose}
                onChange={(value) =>
                  updateRow({
                    clientKey: row.clientKey,
                    patch: { permitPurpose: value as AcquisitionPermitPurpose },
                  })
                }
                options={acquisitionPermitPurposeOptions.map((option) => ({
                  value: option,
                  label: option,
                }))}
                required
                placeholder=""
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor={`permit-quantity-${row.clientKey}`}>許可残数（個）</Label>
                <Input
                  id={`permit-quantity-${row.clientKey}`}
                  type="number"
                  min={1}
                  inputMode="numeric"
                  required
                  value={row.quantity}
                  onChange={(event) =>
                    updateRow({ clientKey: row.clientKey, patch: { quantity: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`permit-expires-on-${row.clientKey}`}>有効期限</Label>
                <IsoDateInput
                  id={`permit-expires-on-${row.clientKey}`}
                  required
                  min={openingDay}
                  value={row.expiresOn}
                  onChange={({ value }) =>
                    updateRow({
                      clientKey: row.clientKey,
                      patch: { expiresOn: value },
                    })
                  }
                />
              </div>
            </div>
          </div>
        ))
      )}

      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <PlusIcon className="size-4" />
        許可繰越を追加
      </Button>
    </div>
  );
}

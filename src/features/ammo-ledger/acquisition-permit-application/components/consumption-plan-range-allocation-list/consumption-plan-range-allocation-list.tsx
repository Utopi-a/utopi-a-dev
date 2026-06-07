"use client";

import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RangeAllocation } from "@/features/ammo-ledger/acquisition-permit-application/consumption-plan/consumption-plan-types";
import type {
  MasterPickerData,
  PickerMasterEntry,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import type { AcquisitionPermitPurpose } from "@/features/ammo-ledger/schema/acquisition-permit-purpose-options";

export type RangeAllocationRowState = {
  id: string;
  rangeId: string;
  rangeName: string;
  rangeAddress: string;
  weight: string;
};

type ConsumptionPlanRangeAllocationListProps = {
  rows: RangeAllocationRowState[];
  onRowsChange: (rows: RangeAllocationRowState[]) => void;
  rangePickerData: MasterPickerData;
};

export function ConsumptionPlanRangeAllocationList({
  rows,
  onRowsChange,
  rangePickerData,
}: ConsumptionPlanRangeAllocationListProps) {
  function updateRow({ rowId, patch }: { rowId: string; patch: Partial<RangeAllocationRowState> }) {
    onRowsChange(rows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  }

  function handleRangeIdChange({ rowId, rangeId }: { rowId: string; rangeId: string }) {
    const found = findPickerMaster({ masterId: rangeId, pickerData: rangePickerData });
    updateRow({
      rowId,
      patch: found
        ? {
            rangeId,
            rangeName: found.name,
            rangeAddress: found.address,
          }
        : { rangeId },
    });
  }

  function handleRangeMasterSelect({
    rowId,
    master,
  }: {
    rowId: string;
    master: PickerMasterEntry;
  }) {
    updateRow({
      rowId,
      patch: {
        rangeId: master.id,
        rangeName: master.name,
        rangeAddress: master.address,
      },
    });
  }

  function handleAddRow() {
    onRowsChange([
      ...rows,
      {
        id: crypto.randomUUID(),
        rangeId: "",
        rangeName: "",
        rangeAddress: "",
        weight: "1",
      },
    ]);
  }

  function handleRemoveRow({ rowId }: { rowId: string }) {
    if (rows.length <= 1) {
      return;
    }
    onRowsChange(rows.filter((row) => row.id !== rowId));
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">射撃場 {index + 1}</p>
            {rows.length > 1 ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={`射撃場 ${index + 1} を削除`}
                onClick={() => handleRemoveRow({ rowId: row.id })}
              >
                <Trash2Icon className="size-4" />
              </Button>
            ) : null}
          </div>

          <MasterPicker
            id={`range-allocation-${row.id}`}
            label="射撃場"
            value={row.rangeId}
            onChange={(rangeId) => handleRangeIdChange({ rowId: row.id, rangeId })}
            onMasterSelect={(master) => handleRangeMasterSelect({ rowId: row.id, master })}
            catalogKind="range"
            pickerData={rangePickerData}
            sheetTitle="射撃場を選ぶ"
            required
          />

          <div className="space-y-2">
            <Label htmlFor={`range-weight-${row.id}`}>配分 weight</Label>
            <Input
              id={`range-weight-${row.id}`}
              type="number"
              min={1}
              value={row.weight}
              onChange={(event) =>
                updateRow({ rowId: row.id, patch: { weight: event.target.value } })
              }
            />
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={handleAddRow}>
        <PlusIcon className="size-4" />
        射撃場を追加
      </Button>
    </div>
  );
}

export function buildRangeAllocationsFromRows({
  rows,
  permitPurpose,
}: {
  rows: RangeAllocationRowState[];
  permitPurpose: AcquisitionPermitPurpose;
}): RangeAllocation[] {
  return rows.flatMap((row) => {
    const weight = Number(row.weight) || 0;
    if (!row.rangeId || weight <= 0 || !row.rangeName) {
      return [];
    }

    return [
      {
        rangeId: row.rangeId,
        rangeName: row.rangeName,
        rangeAddress: row.rangeAddress,
        purpose: permitPurpose,
        weight,
      },
    ];
  });
}

export function createInitialRangeAllocationRows({
  rangePickerData,
}: {
  rangePickerData: MasterPickerData;
}): RangeAllocationRowState[] {
  const firstMaster = rangePickerData.recent[0] ?? rangePickerData.registered[0] ?? null;

  if (!firstMaster) {
    return [
      {
        id: crypto.randomUUID(),
        rangeId: "",
        rangeName: "",
        rangeAddress: "",
        weight: "1",
      },
    ];
  }

  return [
    {
      id: crypto.randomUUID(),
      rangeId: firstMaster.id,
      rangeName: firstMaster.name,
      rangeAddress: firstMaster.address,
      weight: "1",
    },
  ];
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

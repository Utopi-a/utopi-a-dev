"use client";

import type {
  BulkEntryCopyField,
  BulkEntryRowState,
} from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-state";
import { cn } from "@/lib/cn";

type CopyAction = {
  field: BulkEntryCopyField;
  label: string;
};

function buildCopyActions({ row }: { row: BulkEntryRowState }): CopyAction[] {
  const common: CopyAction[] = [
    { field: "occurredOn", label: "日付" },
    { field: "purpose", label: "用途" },
    { field: "ammoTypeId", label: "弾" },
    { field: "packaging", label: "数量" },
  ];

  if (row.inputKind === "consume") {
    return [...common, { field: "rangeId", label: "場所" }, { field: "gunId", label: "銃" }];
  }

  return [...common, { field: "counterparty", label: "譲渡元" }];
}

type BulkEntryCopyActionsProps = {
  row: BulkEntryRowState;
  onCopyField: ({ field }: { field: BulkEntryCopyField }) => void;
  onDuplicateRow: () => void;
};

export function BulkEntryCopyActions({
  row,
  onCopyField,
  onDuplicateRow,
}: BulkEntryCopyActionsProps) {
  const actions = buildCopyActions({ row });

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">上からコピー:</span>
      {actions.map((action) => (
        <button
          key={action.field}
          type="button"
          onClick={() => onCopyField({ field: action.field })}
          className={cn(
            "rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors",
            "hover:border-border hover:bg-muted/40 hover:text-foreground",
          )}
        >
          {action.label}
        </button>
      ))}
      <button
        type="button"
        onClick={onDuplicateRow}
        className={cn(
          "rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors",
          "hover:border-border hover:bg-muted/40 hover:text-foreground",
        )}
      >
        行全体
      </button>
    </div>
  );
}

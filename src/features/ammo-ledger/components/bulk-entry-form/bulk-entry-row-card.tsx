"use client";

import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { IsoDateInput } from "@/components/ui/iso-date-input";
import { Label } from "@/components/ui/label";
import type { ammoGun, ammoType } from "@/db/schema/ammo-ledger";
import { BulkEntryCopyActions } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-copy-actions";
import {
  applyAmmoTypeToRow,
  type BulkEntryCopyField,
  type BulkEntryRowKind,
  type BulkEntryRowState,
  computeBulkEntryRounds,
} from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-state";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { MasterPicker } from "@/features/ammo-ledger/components/master-picker/master-picker";
import { PackagingFields } from "@/features/ammo-ledger/components/packaging-fields/packaging-fields";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
  ledgerPurposes,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { manualCounterpartyId } from "@/features/ammo-ledger/schema/manual-counterparty-id";
import { cn } from "@/lib/cn";

type BulkEntryRowCardProps = {
  row: BulkEntryRowState;
  rowIndex: number;
  guns: (typeof ammoGun.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
  ammoTypeOptions: { value: string; label: string }[];
  canRemove: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onRowChange: ({ nextRow }: { nextRow: BulkEntryRowState }) => void;
  onCopyField: ({ field }: { field: BulkEntryCopyField }) => void;
  onDuplicateRow: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
};

const inputKindLabels: Record<BulkEntryRowKind, string> = {
  consume: "消費",
  acquire: "譲り受け",
};

export function BulkEntryRowCard({
  row,
  rowIndex,
  guns,
  ammoTypes,
  ammoTypeOptions,
  canRemove,
  canMoveUp,
  canMoveDown,
  onRowChange,
  onCopyField,
  onDuplicateRow,
  onMoveUp,
  onMoveDown,
  onRemove,
}: BulkEntryRowCardProps) {
  const computedRounds = computeBulkEntryRounds({ row, ammoTypes });
  const isManualCounterparty = row.counterpartyId === manualCounterpartyId;

  function updateRow({ patch }: { patch: Partial<BulkEntryRowState> }) {
    onRowChange({ nextRow: { ...row, ...patch } });
  }

  function handleInputKindChange({ nextInputKind }: { nextInputKind: BulkEntryRowKind }) {
    updateRow({ patch: { inputKind: nextInputKind } });
  }

  function handleAmmoTypeChange({ nextAmmoTypeId }: { nextAmmoTypeId: string }) {
    onRowChange({
      nextRow: applyAmmoTypeToRow({
        row,
        ammoTypeId: nextAmmoTypeId,
        ammoTypes,
      }),
    });
  }

  return (
    <article className="space-y-4 rounded-xl border border-border/60 bg-card/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {rowIndex + 1}件目
            <span className="ml-2 text-muted-foreground">{inputKindLabels[row.inputKind]}</span>
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            aria-label={`${rowIndex + 1}件目を上へ`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronUp className="size-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            aria-label={`${rowIndex + 1}件目を下へ`}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          >
            <ChevronDown className="size-4" />
          </button>
          {canRemove ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`${rowIndex + 1}件目を削除`}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {rowIndex > 0 ? (
        <BulkEntryCopyActions row={row} onCopyField={onCopyField} onDuplicateRow={onDuplicateRow} />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <FieldSelect
          id={`input-kind-${row.clientId}`}
          label="種別"
          value={row.inputKind}
          onChange={(value) => handleInputKindChange({ nextInputKind: value as BulkEntryRowKind })}
          options={[
            { value: "consume", label: "消費" },
            { value: "acquire", label: "譲り受け" },
          ]}
          placeholder=""
        />

        <div className="space-y-2">
          <Label htmlFor={`occurred-on-${row.clientId}`}>日付</Label>
          <IsoDateInput
            id={`occurred-on-${row.clientId}`}
            required
            value={row.occurredOn}
            onChange={({ value }) => updateRow({ patch: { occurredOn: value } })}
          />
        </div>
      </div>

      <FieldSelect
        id={`purpose-${row.clientId}`}
        label="用途区分"
        value={row.purpose}
        onChange={(value) => updateRow({ patch: { purpose: value as LedgerPurpose } })}
        options={ledgerPurposes.map((purpose) => ({
          value: purpose,
          label: ledgerPurposeLabels[purpose],
        }))}
        required
        placeholder=""
      />

      <FieldSelect
        id={`ammo-type-${row.clientId}`}
        label="弾"
        value={row.ammoTypeId}
        onChange={(value) => handleAmmoTypeChange({ nextAmmoTypeId: value })}
        options={ammoTypeOptions}
        required
      />

      <PackagingFields
        outerBoxCount={row.outerBoxCount}
        boxCount={row.boxCount}
        looseRounds={row.looseRounds}
        onOuterBoxCountChange={(value) => updateRow({ patch: { outerBoxCount: value } })}
        onBoxCountChange={(value) => updateRow({ patch: { boxCount: value } })}
        onLooseRoundsChange={(value) => updateRow({ patch: { looseRounds: value } })}
        looseLabel={row.inputKind === "consume" ? "バラ（±）" : "バラ"}
      />

      <div
        className={cn(
          "rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm",
          computedRounds <= 0 && "opacity-70",
        )}
      >
        <p className="text-muted-foreground">
          {row.inputKind === "consume" ? "実消費" : "譲受数量"}（法定出力）
        </p>
        <p className="text-lg font-semibold">{computedRounds}発</p>
      </div>

      {row.inputKind === "consume" ? (
        <>
          <MasterPicker
            id={`range-${row.clientId}`}
            label="場所"
            value={row.rangeId}
            onChange={(value) => updateRow({ patch: { rangeId: value } })}
            catalogKind="range"
            sheetTitle="射撃場を選ぶ"
            required
          />

          <FieldSelect
            id={`gun-${row.clientId}`}
            label="銃"
            value={row.gunId}
            onChange={(value) => updateRow({ patch: { gunId: value } })}
            options={guns.map((gun) => ({
              value: gun.id,
              label: `${gun.name}（${gun.gunNumber} / ${gun.permitNumber}）`,
            }))}
            required
          />
        </>
      ) : (
        <>
          <MasterPicker
            id={`counterparty-${row.clientId}`}
            label="譲渡元（購入先）"
            value={row.counterpartyId}
            onChange={(value) => updateRow({ patch: { counterpartyId: value } })}
            catalogKind="gun_shop"
            includeRangeCatalog
            sheetTitle="購入先を選ぶ"
            manualOption={{ value: manualCounterpartyId, label: "手入力する" }}
            required
          />

          {isManualCounterparty ? (
            <>
              <div className="space-y-2">
                <Label htmlFor={`counterparty-name-${row.clientId}`}>相手方氏名</Label>
                <Input
                  id={`counterparty-name-${row.clientId}`}
                  required
                  value={row.counterpartyName}
                  onChange={(event) =>
                    updateRow({ patch: { counterpartyName: event.target.value } })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`counterparty-address-${row.clientId}`}>相手方住所</Label>
                <Input
                  id={`counterparty-address-${row.clientId}`}
                  required
                  value={row.counterpartyAddress}
                  onChange={(event) =>
                    updateRow({ patch: { counterpartyAddress: event.target.value } })
                  }
                />
              </div>
            </>
          ) : null}
        </>
      )}
    </article>
  );
}

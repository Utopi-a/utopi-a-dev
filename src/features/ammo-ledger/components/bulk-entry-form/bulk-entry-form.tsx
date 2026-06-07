"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ammoGun, ammoType } from "@/db/schema/ammo-ledger";
import type { MasterPickerData } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import { BulkEntryRowCard } from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-card";
import {
  type BulkEntryCopyField,
  type BulkEntryRowKind,
  type BulkEntryRowState,
  buildBulkEntryPayload,
  computeBulkEntryRounds,
  copyBulkEntryField,
  createBulkEntryRow,
  duplicateBulkEntryRow,
  hasBulkEntryPackaging,
} from "@/features/ammo-ledger/components/bulk-entry-form/bulk-entry-row-state";
import { moveBulkEntryRow } from "@/features/ammo-ledger/components/bulk-entry-form/move-bulk-entry-row/move-bulk-entry-row";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { buildAmmoTypeFieldOptions } from "@/features/ammo-ledger/master/build-ammo-type-field-options/build-ammo-type-field-options";
import { createBulkTransactionsAction } from "@/features/ammo-ledger/transactions/create-bulk-transactions/create-bulk-transactions-action";
import { useInvalidateAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";

type BulkEntryFormProps = {
  guns: (typeof ammoGun.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
  stockByAmmoTypeId: Record<string, number>;
  rangePickerData: MasterPickerData;
  counterpartyPickerData: MasterPickerData;
  defaultCounterpartyId: string;
};

export function BulkEntryForm({
  guns,
  ammoTypes,
  stockByAmmoTypeId,
  rangePickerData,
  counterpartyPickerData,
  defaultCounterpartyId,
}: BulkEntryFormProps) {
  const router = useRouter();
  const invalidateWorkspace = useInvalidateAmmoLedgerWorkspace();
  const today = new Date().toISOString().slice(0, 10);

  const [rows, setRows] = useState<BulkEntryRowState[]>(() => [
    createBulkEntryRow({
      inputKind: "consume",
      occurredOn: today,
      defaultCounterpartyId,
    }),
  ]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const ammoTypeOptions = useMemo(
    () =>
      buildAmmoTypeFieldOptions({
        ammoTypes,
        stockByAmmoTypeId,
        roundsPerBoxLabel: "小箱",
      }),
    [ammoTypes, stockByAmmoTypeId],
  );

  const activeRowCount = useMemo(
    () => rows.filter((row) => hasBulkEntryPackaging({ row })).length,
    [rows],
  );

  const totalRounds = useMemo(
    () => rows.reduce((total, row) => total + computeBulkEntryRounds({ row, ammoTypes }), 0),
    [rows, ammoTypes],
  );

  function updateRow({ clientId, nextRow }: { clientId: string; nextRow: BulkEntryRowState }) {
    setRows((current) => current.map((row) => (row.clientId === clientId ? nextRow : row)));
  }

  function addRow({ inputKind }: { inputKind: BulkEntryRowKind }) {
    const previousRow = rows.at(-1);
    setRows((current) => [
      ...current,
      createBulkEntryRow({
        inputKind,
        occurredOn: previousRow?.occurredOn ?? today,
        defaultCounterpartyId,
      }),
    ]);
  }

  function removeRow({ clientId }: { clientId: string }) {
    setRows((current) => current.filter((row) => row.clientId !== clientId));
  }

  function copyFieldFromAbove({
    rowIndex,
    field,
  }: {
    rowIndex: number;
    field: BulkEntryCopyField;
  }) {
    const source = rows[rowIndex - 1];
    const target = rows[rowIndex];
    if (!source || !target) {
      return;
    }

    updateRow({
      clientId: target.clientId,
      nextRow: copyBulkEntryField({ source, target, field }),
    });
  }

  function duplicateRowFromAbove({ rowIndex }: { rowIndex: number }) {
    const source = rows[rowIndex - 1];
    const target = rows[rowIndex];
    if (!source || !target) {
      return;
    }

    updateRow({
      clientId: target.clientId,
      nextRow: {
        ...duplicateBulkEntryRow({ source }),
        clientId: target.clientId,
      },
    });
  }

  function moveRow({ fromIndex, toIndex }: { fromIndex: number; toIndex: number }) {
    setRows((current) => moveBulkEntryRow({ rows: current, fromIndex, toIndex }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setIsPending(true);
    setError(null);

    const entries = rows
      .map((row) => buildBulkEntryPayload({ row }))
      .filter((entry) => entry !== null);

    if (entries.length === 0) {
      setError("1件以上の記録に数量を入力してください");
      setIsPending(false);
      return;
    }

    const result = await createBulkTransactionsAction({ entries });

    if (result.ok) {
      showAmmoLedgerToast({
        action: "created",
        subject: `記録 ${result.createdCount}件`,
      });
      await invalidateWorkspace();
      router.push(result.redirectPath);
      return;
    }

    setError(result.error);
    setIsPending(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <BulkEntryRowCard
            key={row.clientId}
            row={row}
            rowIndex={rowIndex}
            guns={guns}
            ammoTypes={ammoTypes}
            ammoTypeOptions={ammoTypeOptions}
            rangePickerData={rangePickerData}
            counterpartyPickerData={counterpartyPickerData}
            canRemove={rows.length > 1}
            canMoveUp={rowIndex > 0}
            canMoveDown={rowIndex < rows.length - 1}
            onRowChange={({ nextRow }) => updateRow({ clientId: row.clientId, nextRow })}
            onCopyField={({ field }) => copyFieldFromAbove({ rowIndex, field })}
            onDuplicateRow={() => duplicateRowFromAbove({ rowIndex })}
            onMoveUp={() => moveRow({ fromIndex: rowIndex, toIndex: rowIndex - 1 })}
            onMoveDown={() => moveRow({ fromIndex: rowIndex, toIndex: rowIndex + 1 })}
            onRemove={() => removeRow({ clientId: row.clientId })}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => addRow({ inputKind: "consume" })}>
          + 消費を追加
        </Button>
        <Button type="button" variant="outline" onClick={() => addRow({ inputKind: "acquire" })}>
          + 譲り受けを追加
        </Button>
      </div>

      <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
        <p className="text-muted-foreground">保存対象</p>
        <p className="text-lg font-semibold">
          {activeRowCount}件 · 合計 {totalRounds}発
        </p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Button type="submit" disabled={isPending || activeRowCount === 0}>
        {isPending ? "保存中…" : `${activeRowCount}件をまとめて保存`}
      </Button>
    </form>
  );
}

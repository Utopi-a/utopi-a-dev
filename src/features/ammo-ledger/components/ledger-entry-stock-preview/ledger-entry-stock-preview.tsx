"use client";

import Link from "next/link";
import { buildOpeningBalanceHref } from "@/features/ammo-ledger/opening-balance/build-opening-balance-href/build-opening-balance-href";
import {
  type LedgerPurpose,
  ledgerPurposeLabels,
} from "@/features/ammo-ledger/schema/ledger-purpose";
import { parseLedgerPurpose } from "@/features/ammo-ledger/schema/resolve-default-purpose";
import type { LedgerTransactionPayload } from "@/features/ammo-ledger/transactions/prepare-optimistic-ledger-entry/prepare-optimistic-ledger-entry";
import {
  type LedgerEntryPreview,
  previewLedgerEntry,
} from "@/features/ammo-ledger/transactions/preview-ledger-entry/preview-ledger-entry";
import { useAmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { cn } from "@/lib/cn";

/** 入力中の記録を帳簿のデータで確かめる。帳簿の読み込み前と弾の未選択時は null */
export function useLedgerEntryPreview({
  payload,
  ledgerEntryId,
}: {
  payload: LedgerTransactionPayload | null;
  ledgerEntryId?: string;
}): LedgerEntryPreview | null {
  const { workspace } = useAmmoLedgerWorkspace();
  return workspace && payload
    ? previewLedgerEntry({ workspace, payload, ledgerEntryId, now: new Date() })
    : null;
}

/** 記録する用途の残数と、記録した後の残数 */
export function PurposeStockAfterEntry({
  purpose,
  purposeStock,
  rounds,
}: {
  purpose: LedgerPurpose;
  purposeStock: number;
  rounds: number;
}) {
  const stockAfterEntry = purposeStock - rounds;
  return (
    <p
      className={cn(
        "mt-1 text-xs tabular-nums",
        stockAfterEntry < 0
          ? "font-medium text-amber-700 dark:text-amber-300"
          : "text-muted-foreground",
      )}
    >
      {ledgerPurposeLabels[purpose]}の残{purposeStock}個 → 記録後 {stockAfterEntry}個
    </p>
  );
}

/** 保存すると拒否される理由を、保存ボタンを押す前から示す */
export function LedgerEntryCheckNotice({ preview }: { preview: LedgerEntryPreview | null }) {
  if (!preview?.error) {
    return null;
  }
  const shortagePurpose = preview.shortage
    ? parseLedgerPurpose({ value: preview.shortage.purpose })
    : null;

  return (
    <p
      role="status"
      className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-800 dark:text-amber-200"
    >
      {preview.error}
      {preview.shortage && shortagePurpose ? (
        <>
          {" "}
          <Link
            href={buildOpeningBalanceHref({
              occurredOn: preview.shortage.occurredOn,
              purpose: shortagePurpose,
            })}
            className="underline"
          >
            年初繰越を確認する
          </Link>
        </>
      ) : null}
    </p>
  );
}

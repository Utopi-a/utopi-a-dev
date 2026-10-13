"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { useAmmoLedgerClientNav } from "@/features/ammo-ledger/navigation/use-ammo-ledger-client-nav/use-ammo-ledger-client-nav";
import { buildLedgerEntryRedirectPath } from "@/features/ammo-ledger/transactions/build-ledger-entry-redirect-path/build-ledger-entry-redirect-path";
import { createTransactionAction } from "@/features/ammo-ledger/transactions/create-transaction/create-transaction-action";
import {
  type LedgerTransactionDisplay,
  type LedgerTransactionPayload,
  prepareOptimisticLedgerEntry,
} from "@/features/ammo-ledger/transactions/prepare-optimistic-ledger-entry/prepare-optimistic-ledger-entry";
import { updateTransactionAction } from "@/features/ammo-ledger/transactions/update-transaction/update-transaction-action";
import {
  type PendingLedgerActionResult,
  usePendingLedgerChanges,
  useRunPendingLedgerChange,
} from "@/features/ammo-ledger/workspace/pending-ledger-changes/pending-ledger-changes";
import {
  useAmmoLedgerWorkspace,
  useRequestAmmoLedgerWorkspaceRevalidation,
} from "@/features/ammo-ledger/workspace/use-ammo-ledger-workspace/use-ammo-ledger-workspace";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

function currentHrefWithoutRestore(): string {
  const url = new URL(window.location.href);
  url.searchParams.delete("restore");
  return `${url.pathname}${url.search}`;
}

function clearHighlightedEntry({ entryId }: { entryId: string }) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("entry") !== entryId) {
    return;
  }
  url.searchParams.delete("entry");
  window.history.replaceState(null, "", url);
}

/**
 * 記録の保存を帳簿へ先行反映し、すぐ帳簿へ移動する。
 * 保存に失敗した入力は `restore` で入力画面に戻したとき `restoredValues` として返す。
 * 呼び出し側は restore ごとにフォームを作り直す（key に restore ID を含める）。
 */
export function useLedgerTransactionSubmit<TValues>({
  formKey,
  ledgerEntryId,
}: {
  formKey: string;
  ledgerEntryId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigate } = useAmmoLedgerClientNav();
  const { workspace } = useAmmoLedgerWorkspace();
  const { changes, remove } = usePendingLedgerChanges();
  const runPendingChange = useRunPendingLedgerChange();
  const requestRevalidation = useRequestAmmoLedgerWorkspaceRevalidation();

  // 戻した入力と、その失敗記録をフォームの作成時に固定する。
  // 入力中に URL やアラートが変わっても、別の失敗記録の値と混ざらないようにする。
  const [restored] = useState(() => {
    const restoreId = searchParams.get("restore");
    const change = changes.find(
      (item) =>
        item.id === restoreId && item.status === "failed" && item.restore?.formKey === formKey,
    );
    return change?.restore
      ? {
          changeId: change.id,
          values: change.restore.values as TValues,
          entryId: change.restore.entryId,
        }
      : undefined;
  });

  async function saveTransaction({
    payload,
    newEntryId,
  }: {
    payload: LedgerTransactionPayload;
    newEntryId: string;
  }): Promise<PendingLedgerActionResult> {
    const result = ledgerEntryId
      ? await updateTransactionAction({ ledgerEntryId, ...payload })
      : await createTransactionAction({ ...payload, ledgerEntryId: newEntryId });
    if (!result.ok) {
      return result;
    }
    return {
      ok: true,
      changes: { upserted: result.entry ? [result.entry] : [], removedIds: [] },
      message:
        "alreadySaved" in result && result.alreadySaved
          ? "この記録は前回の送信で保存済みでした。内容を確認してください"
          : undefined,
    };
  }

  function navigateToLedger({ href }: { href: string }) {
    if (!navigate({ href })) {
      router.push(href);
    }
  }

  async function submit({
    payload,
    display,
    subject,
    restoreValues,
  }: {
    payload: LedgerTransactionPayload;
    display?: LedgerTransactionDisplay;
    subject: string;
    restoreValues: TValues;
  }): Promise<{ ok: true } | { ok: false; error: string }> {
    const successMessage = `${subject}を${ledgerEntryId ? "更新" : "保存"}しました`;
    // 入力に戻って保存し直すときは同じ記録 ID を使い、前回が保存済みでも二重登録しない。
    const newEntryId = restored?.entryId ?? crypto.randomUUID();

    if (!workspace) {
      // 帳簿データが未取得のときは先行表示できないため、保存完了を待ってから移動する。
      const result = await saveTransaction({ payload, newEntryId });
      if (!result.ok) {
        return result;
      }
      toast.success(result.message ?? successMessage);
      requestRevalidation();
      navigateToLedger({
        href: buildLedgerEntryRedirectPath({
          purpose: payload.purpose,
          ledgerEntryId: result.changes.upserted[0]?.id ?? ledgerEntryId ?? newEntryId,
        }),
      });
      return { ok: true };
    }

    const prepared = prepareOptimisticLedgerEntry({
      workspace,
      payload,
      display,
      ledgerEntryId,
      provisionalId: newEntryId,
      now: new Date(),
    });
    if (!prepared.ok) {
      // 別の端末での変更が反映されていない可能性があるため、次の判定に備えて取り直す。
      requestRevalidation();
      return prepared;
    }

    if (restored) {
      remove({ id: restored.changeId });
    }

    const { entry } = prepared;
    runPendingChange({
      overlay: { upserted: [entry], removedIds: [] },
      summary: `${subject}（${formatIsoDateForDisplay({ value: entry.occurredOn })} ${entry.ammoTypeName} ${formatStockQuantity({ quantity: entry.quantity })}）`,
      restore: {
        formKey,
        href: currentHrefWithoutRestore(),
        values: restoreValues,
        entryId: ledgerEntryId ? undefined : entry.id,
      },
      successMessage,
      action: () => saveTransaction({ payload, newEntryId }),
      // 編集は保存済みかを行の有無で判定できないため、新規作成だけ照合する。
      isApplied: ledgerEntryId
        ? undefined
        : (latest) => latest.entries.some((item) => item.id === entry.id),
      onFailed: () => {
        if (!ledgerEntryId) {
          clearHighlightedEntry({ entryId: entry.id });
        }
      },
    });

    navigateToLedger({
      href: buildLedgerEntryRedirectPath({ purpose: payload.purpose, ledgerEntryId: entry.id }),
    });
    return { ok: true };
  }

  return { submit, restoredValues: restored?.values };
}

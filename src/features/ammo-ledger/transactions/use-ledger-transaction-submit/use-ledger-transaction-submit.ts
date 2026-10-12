"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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

/** 先行表示した行の ID を、確定した ID に差し替える（失敗時は強調表示を外す）。 */
function replaceHighlightedEntryId({ from, to }: { from: string; to: string | null }) {
  const url = new URL(window.location.href);
  if (from === to || url.searchParams.get("entry") !== from) {
    return;
  }
  if (to) {
    url.searchParams.set("entry", to);
  } else {
    url.searchParams.delete("entry");
  }
  window.history.replaceState(null, "", url);
}

/**
 * 記録の保存を帳簿へ先行反映し、すぐ帳簿へ移動する。
 * 保存に失敗した入力は `restore` で入力画面に戻したとき `restoredValues` として返す。
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

  const restoreId = searchParams.get("restore");
  const restoredChange = changes.find(
    (change) =>
      change.id === restoreId && change.status === "failed" && change.restore?.formKey === formKey,
  );
  // 初回描画の値だけを使い、入力中にアラートを閉じても入力欄を戻さない。
  const [restoredValues] = useState(() => restoredChange?.restore?.values as TValues | undefined);

  async function saveTransaction({
    payload,
  }: {
    payload: LedgerTransactionPayload;
  }): Promise<PendingLedgerActionResult> {
    const result = ledgerEntryId
      ? await updateTransactionAction({ ledgerEntryId, ...payload })
      : await createTransactionAction(payload);
    if (!result.ok) {
      return result;
    }
    return { ok: true, changes: { upserted: result.entry ? [result.entry] : [], removedIds: [] } };
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

    if (!workspace) {
      // 帳簿データが未取得のときは先行表示できないため、保存完了を待ってから移動する。
      const result = await saveTransaction({ payload });
      if (!result.ok) {
        return result;
      }
      toast.success(successMessage);
      requestRevalidation();
      navigateToLedger({
        href: buildLedgerEntryRedirectPath({
          purpose: payload.purpose,
          ledgerEntryId: result.changes.upserted[0]?.id ?? ledgerEntryId ?? "",
        }),
      });
      return { ok: true };
    }

    const prepared = prepareOptimisticLedgerEntry({
      workspace,
      payload,
      display,
      ledgerEntryId,
      provisionalId: `pending-${crypto.randomUUID()}`,
      now: new Date(),
    });
    if (!prepared.ok) {
      return prepared;
    }

    if (restoredChange) {
      remove({ id: restoredChange.id });
    }

    const { entry } = prepared;
    runPendingChange({
      overlay: { upserted: [entry], removedIds: [] },
      summary: `${subject}（${formatIsoDateForDisplay({ value: entry.occurredOn })} ${entry.ammoTypeName} ${entry.quantity}発）`,
      restore: { formKey, href: currentHrefWithoutRestore(), values: restoreValues },
      successMessage,
      action: () => saveTransaction({ payload }),
      onConfirmed: ({ changes: confirmed }) => {
        const savedId = confirmed.upserted[0]?.id;
        if (savedId) {
          replaceHighlightedEntryId({ from: entry.id, to: savedId });
        }
      },
      onFailed: () => {
        if (!ledgerEntryId) {
          replaceHighlightedEntryId({ from: entry.id, to: null });
        }
      },
    });

    navigateToLedger({
      href: buildLedgerEntryRedirectPath({ purpose: payload.purpose, ledgerEntryId: entry.id }),
    });
    return { ok: true };
  }

  return { submit, restoredValues };
}

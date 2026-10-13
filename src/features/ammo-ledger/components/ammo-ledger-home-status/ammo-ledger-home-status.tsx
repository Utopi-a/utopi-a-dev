"use client";

import { Button } from "@/components/ui/button";
import { AmmoLedgerNavLink } from "@/features/ammo-ledger/components/ammo-ledger-nav-link/ammo-ledger-nav-link";
import { buildHomeStatus } from "@/features/ammo-ledger/home-status/build-home-status/build-home-status";
import { buildLedgerHref } from "@/features/ammo-ledger/ledger/build-ledger-href/build-ledger-href";
import { formatStockQuantity } from "@/features/ammo-ledger/ledger/format-ledger-quantity/format-ledger-quantity";
import { formatPermitExpiryLabel } from "@/features/ammo-ledger/permit/compute-permit-expiry/compute-permit-expiry";
import { ledgerPurposeTabLabels } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import { cn } from "@/lib/cn";
import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";
import { getTokyoIsoDate } from "@/lib/date/get-tokyo-iso-date";

type AmmoLedgerHomeStatusProps = {
  workspace: AmmoLedgerWorkspace | undefined;
  error: unknown;
  onRetry: () => void;
};

const tileClassName =
  "flex min-h-[4.5rem] flex-col gap-0.5 rounded-xl border border-border/60 bg-card/40 px-4 py-3 transition-colors hover:border-border hover:bg-muted/30";

function StatusTile({
  href,
  label,
  value,
  detail,
}: {
  href: string;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <AmmoLedgerNavLink href={href} className={tileClassName}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </AmmoLedgerNavLink>
  );
}

function HomeStatusContent({ workspace }: { workspace: AmmoLedgerWorkspace }) {
  const today = getTokyoIsoDate();
  const { totalStock, permitSummaries, lockedThrough, notices } = buildHomeStatus({
    workspace,
    today,
  });

  return (
    <>
      {notices.length > 0 ? (
        <ul aria-label="注意事項" className="space-y-2">
          {notices.map((notice) => (
            <li key={notice.id}>
              <AmmoLedgerNavLink
                href={notice.href}
                className={cn(
                  "flex min-h-11 items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  notice.tone === "warning"
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-900 hover:bg-amber-500/10 dark:text-amber-100"
                    : "border-border/60 bg-muted/20 hover:bg-muted/40",
                )}
              >
                <span className="min-w-0 flex-1">{notice.message}</span>
                <span aria-hidden>→</span>
              </AmmoLedgerNavLink>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <StatusTile
          href="/lab/ammo-ledger/inventory"
          label="帳簿残数（全用途）"
          value={formatStockQuantity({ quantity: totalStock })}
          detail="残弾を開く →"
        />
        {permitSummaries.length === 0 ? (
          <StatusTile
            href="/lab/ammo-ledger/settings/permits"
            label="譲受許可"
            value="有効な許可なし"
            detail="許可を登録する →"
          />
        ) : (
          permitSummaries.map(({ purpose, balance, nearestExpiresOn }) => (
            <StatusTile
              key={purpose}
              href={buildLedgerHref({ purpose })}
              label={`今日使える許可の残り（${ledgerPurposeTabLabels[purpose]}）`}
              value={formatStockQuantity({ quantity: balance })}
              detail={
                nearestExpiresOn
                  ? `最も近い期限: ${formatPermitExpiryLabel({ expiresOn: nearestExpiresOn, today })}`
                  : "今日使える許可はありません"
              }
            />
          ))
        )}
        <StatusTile
          href="/lab/ammo-ledger/ledger"
          label="帳簿の確定"
          value={
            lockedThrough ? `${formatIsoDateForDisplay({ value: lockedThrough })}まで` : "未確定"
          }
          detail="帳簿を開く →"
        />
      </div>
    </>
  );
}

export function AmmoLedgerHomeStatus({ workspace, error, onRetry }: AmmoLedgerHomeStatusProps) {
  return (
    <section aria-labelledby="ammo-ledger-home-status-heading" className="space-y-3">
      <h2
        id="ammo-ledger-home-status-heading"
        className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        いまの状況
      </h2>
      {workspace ? (
        <HomeStatusContent workspace={workspace} />
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-4 py-3 text-sm">
          <span>状況を読み込めませんでした。</span>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            再試行
          </Button>
        </div>
      ) : (
        <div role="status" aria-label="状況を読み込み中" className="grid gap-3 sm:grid-cols-2">
          {["stock", "permit", "lock"].map((key) => (
            <div
              key={key}
              className="h-[4.5rem] animate-pulse rounded-xl border border-border/40 bg-muted/30"
            />
          ))}
        </div>
      )}
    </section>
  );
}

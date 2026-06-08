import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerPrintCoverProps = {
  ownerName: string;
  ownerAddress?: string | null;
  sectionLabels: string[];
  from: string;
  to: string;
};

export function LedgerPrintCover({
  ownerName,
  ownerAddress,
  sectionLabels,
  from,
  to,
}: LedgerPrintCoverProps) {
  const printedOn = new Date().toISOString().slice(0, 10);

  return (
    <section className="ledger-print-page ledger-print-cover-page flex flex-col items-center justify-center space-y-6 text-center">
      <h1 className="text-2xl font-bold">実包管理帳簿</h1>
      <p className="text-sm">{sectionLabels.join("・")}</p>
      <div className="space-y-1 text-sm">
        <p>氏名: {ownerName}</p>
        {ownerAddress ? <p>住所: {ownerAddress}</p> : null}
        <p>
          記録期間: {formatIsoDateForDisplay({ value: from })} 〜{" "}
          {formatIsoDateForDisplay({ value: to })}
        </p>
        <p>作成日: {formatIsoDateForDisplay({ value: printedOn })}</p>
      </div>
      <p className="max-w-lg text-xs text-muted-foreground">
        本帳簿は猟銃・散弾銃等の実包管理に関する記録です。別紙1に使用銃の一覧、別紙2に射撃場・銃砲火薬店等の一覧を添付します。
      </p>
    </section>
  );
}

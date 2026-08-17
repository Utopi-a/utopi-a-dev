import { formatIsoDateForDisplay } from "@/lib/date/format-iso-date-for-display";

type LedgerPrintCoverProps = {
  ownerName: string;
  ownerAddress?: string | null;
  purposeLabels: string[];
  from: string;
  to: string;
};

export function LedgerPrintCover({
  ownerName,
  ownerAddress,
  purposeLabels,
  from,
  to,
}: LedgerPrintCoverProps) {
  const printedOn = new Date().toISOString().slice(0, 10);

  return (
    <section className="ledger-print-page ledger-print-cover-page flex flex-col items-center justify-center space-y-8 text-center">
      <h1 className="text-xl font-bold tracking-wide">実包管理帳簿</h1>
      <p className="text-sm text-gray-700">{purposeLabels.join("・")}</p>
      <table className="mx-auto text-sm" style={{ borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td className="px-3 py-1.5 text-right text-gray-600">氏名</td>
            <td className="px-3 py-1.5 border-b border-gray-400">{ownerName}</td>
          </tr>
          {ownerAddress ? (
            <tr>
              <td className="px-3 py-1.5 text-right text-gray-600">住所</td>
              <td className="px-3 py-1.5 border-b border-gray-400">{ownerAddress}</td>
            </tr>
          ) : null}
          <tr>
            <td className="px-3 py-1.5 text-right text-gray-600">記録期間</td>
            <td className="px-3 py-1.5 border-b border-gray-400">
              {formatIsoDateForDisplay({ value: from })} 〜 {formatIsoDateForDisplay({ value: to })}
            </td>
          </tr>
          <tr>
            <td className="px-3 py-1.5 text-right text-gray-600">作成日</td>
            <td className="px-3 py-1.5 border-b border-gray-400">
              {formatIsoDateForDisplay({ value: printedOn })}
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

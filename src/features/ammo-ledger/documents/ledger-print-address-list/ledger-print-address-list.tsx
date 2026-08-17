import type { ammoRange } from "@/db/schema/ammo-ledger";
import type { CounterpartyReference } from "@/features/ammo-ledger/documents/build-counterparty-references/build-counterparty-references";

type LedgerPrintAddressListProps = {
  ranges: (typeof ammoRange.$inferSelect)[];
  counterpartyReferences: CounterpartyReference[];
};

export function LedgerPrintAddressList({
  ranges,
  counterpartyReferences,
}: LedgerPrintAddressListProps) {
  return (
    <section className="ledger-print-page space-y-6">
      <header className="text-center">
        <h2 className="text-sm font-bold">別紙2　相手方住所・射撃場一覧</h2>
      </header>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold">相手方住所</h3>
        <table className="ledger-print-section-table w-full">
          <thead>
            <tr>
              <th style={{ width: "4em" }}>参照</th>
              <th>名称</th>
              <th>住所</th>
            </tr>
          </thead>
          <tbody>
            {counterpartyReferences.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center py-2">
                  該当なし
                </td>
              </tr>
            ) : (
              counterpartyReferences.map((ref) => (
                <tr key={`cp-${ref.symbol}`}>
                  <td>相手方{ref.symbol}</td>
                  <td>{ref.name}</td>
                  <td>{ref.address ?? ""}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-semibold">射撃場</h3>
        <table className="ledger-print-section-table w-full">
          <thead>
            <tr>
              <th>名称</th>
              <th>所在地</th>
            </tr>
          </thead>
          <tbody>
            {ranges.length === 0 ? (
              <tr>
                <td colSpan={2} className="text-center py-2">
                  登録なし
                </td>
              </tr>
            ) : (
              ranges.map((range) => (
                <tr key={range.id}>
                  <td>{range.name}</td>
                  <td>{range.address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

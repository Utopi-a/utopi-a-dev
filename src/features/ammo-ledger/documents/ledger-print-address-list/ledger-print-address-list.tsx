import type { ammoCounterparty, ammoRange } from "@/db/schema/ammo-ledger";

type LedgerPrintAddressListProps = {
  ranges: (typeof ammoRange.$inferSelect)[];
  counterparties: (typeof ammoCounterparty.$inferSelect)[];
};

export function LedgerPrintAddressList({ ranges, counterparties }: LedgerPrintAddressListProps) {
  return (
    <section className="ledger-print-page space-y-6">
      <header className="text-center">
        <h2 className="text-lg font-bold">別紙2　射撃場・銃砲火薬店等の一覧</h2>
      </header>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">射撃場</h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1">名称</th>
              <th className="border border-black px-2 py-1">所在地</th>
            </tr>
          </thead>
          <tbody>
            {ranges.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-black px-2 py-2 text-center">
                  登録なし
                </td>
              </tr>
            ) : (
              ranges.map((range) => (
                <tr key={range.id}>
                  <td className="border border-black px-2 py-1">{range.name}</td>
                  <td className="border border-black px-2 py-1">{range.address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">銃砲火薬店・譲渡相手</h3>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-black px-2 py-1">名称</th>
              <th className="border border-black px-2 py-1">所在地</th>
            </tr>
          </thead>
          <tbody>
            {counterparties.length === 0 ? (
              <tr>
                <td colSpan={2} className="border border-black px-2 py-2 text-center">
                  登録なし
                </td>
              </tr>
            ) : (
              counterparties.map((item) => (
                <tr key={item.id}>
                  <td className="border border-black px-2 py-1">{item.name}</td>
                  <td className="border border-black px-2 py-1">{item.address}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

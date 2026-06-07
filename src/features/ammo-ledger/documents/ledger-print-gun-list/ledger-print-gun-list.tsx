import type { ammoGun } from "@/db/schema/ammo-ledger";

type LedgerPrintGunListProps = {
  guns: (typeof ammoGun.$inferSelect)[];
};

export function LedgerPrintGunList({ guns }: LedgerPrintGunListProps) {
  return (
    <section className="ledger-print-page space-y-4">
      <header className="text-center">
        <h2 className="text-lg font-bold">別紙1　使用銃の一覧</h2>
      </header>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="border border-black px-2 py-1">名称</th>
            <th className="border border-black px-2 py-1">銃番号</th>
            <th className="border border-black px-2 py-1">許可番号</th>
            <th className="border border-black px-2 py-1">銃種</th>
            <th className="border border-black px-2 py-1">番径</th>
            <th className="border border-black px-2 py-1">用途</th>
          </tr>
        </thead>
        <tbody>
          {guns.length === 0 ? (
            <tr>
              <td colSpan={6} className="border border-black px-2 py-2 text-center">
                登録なし
              </td>
            </tr>
          ) : (
            guns.map((gun) => (
              <tr key={gun.id}>
                <td className="border border-black px-2 py-1">{gun.name}</td>
                <td className="border border-black px-2 py-1">{gun.gunNumber}</td>
                <td className="border border-black px-2 py-1">{gun.permitNumber}</td>
                <td className="border border-black px-2 py-1">{gun.gunType}</td>
                <td className="border border-black px-2 py-1">{gun.caliber}</td>
                <td className="border border-black px-2 py-1">{gun.purpose ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

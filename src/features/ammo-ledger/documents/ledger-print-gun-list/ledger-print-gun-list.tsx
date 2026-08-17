import type { ammoGun } from "@/db/schema/ammo-ledger";

type LedgerPrintGunListProps = {
  guns: (typeof ammoGun.$inferSelect)[];
};

export function LedgerPrintGunList({ guns }: LedgerPrintGunListProps) {
  return (
    <section className="ledger-print-page space-y-4">
      <header className="text-center">
        <h2 className="text-sm font-bold">別紙1　使用銃の一覧</h2>
      </header>
      <table className="ledger-print-section-table w-full">
        <thead>
          <tr>
            <th>名称</th>
            <th>銃番号</th>
            <th>許可番号</th>
            <th>銃種</th>
            <th>番径</th>
            <th>用途</th>
          </tr>
        </thead>
        <tbody>
          {guns.length === 0 ? (
            <tr>
              <td colSpan={6} className="text-center py-2">
                登録なし
              </td>
            </tr>
          ) : (
            guns.map((gun) => (
              <tr key={gun.id}>
                <td>{gun.name}</td>
                <td>{gun.gunNumber}</td>
                <td>{gun.permitNumber}</td>
                <td>{gun.gunType}</td>
                <td>{gun.caliber}</td>
                <td>{gun.purpose ?? ""}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

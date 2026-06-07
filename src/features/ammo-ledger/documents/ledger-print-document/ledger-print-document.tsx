import type {
  ammoCounterparty,
  ammoGun,
  ammoLedgerEntry,
  ammoRange,
} from "@/db/schema/ammo-ledger";
import { LedgerPrintAddressList } from "@/features/ammo-ledger/documents/ledger-print-address-list/ledger-print-address-list";
import { LedgerPrintCover } from "@/features/ammo-ledger/documents/ledger-print-cover/ledger-print-cover";
import { LedgerPrintGunList } from "@/features/ammo-ledger/documents/ledger-print-gun-list/ledger-print-gun-list";
import { LedgerPrintStyles } from "@/features/ammo-ledger/documents/ledger-print-styles/ledger-print-styles";
import { LedgerPrintView } from "@/features/ammo-ledger/documents/ledger-print-view/ledger-print-view";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerPrintDocumentProps = {
  ownerName: string;
  purpose: LedgerPurpose;
  from: string;
  to: string;
  guns: (typeof ammoGun.$inferSelect)[];
  ranges: (typeof ammoRange.$inferSelect)[];
  counterparties: (typeof ammoCounterparty.$inferSelect)[];
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitBalances?: Map<string, number>;
};

export function LedgerPrintDocument({
  ownerName,
  purpose,
  from,
  to,
  guns,
  ranges,
  counterparties,
  entries,
  permitBalances,
}: LedgerPrintDocumentProps) {
  return (
    <div className="ledger-print space-y-4">
      <LedgerPrintStyles />

      <div className="no-print mb-4">
        <p className="text-sm text-muted-foreground">
          ブラウザの印刷機能で「PDFに保存」できます。表紙・別紙・帳簿本体が順に出力されます。
        </p>
      </div>

      <LedgerPrintCover ownerName={ownerName} purpose={purpose} from={from} to={to} />
      <LedgerPrintGunList guns={guns} />
      <LedgerPrintAddressList ranges={ranges} counterparties={counterparties} />
      <LedgerPrintView
        entries={entries}
        from={from}
        to={to}
        purpose={purpose}
        permitBalances={permitBalances}
      />
    </div>
  );
}

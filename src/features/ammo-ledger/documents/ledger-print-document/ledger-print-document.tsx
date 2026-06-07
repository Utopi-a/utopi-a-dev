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
import { ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerPrintPurposeData = {
  purpose: LedgerPurpose;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitBalances?: Map<string, number>;
};

type LedgerPrintDocumentProps = {
  ownerName: string;
  ownerAddress?: string | null;
  from: string;
  to: string;
  guns: (typeof ammoGun.$inferSelect)[];
  ranges: (typeof ammoRange.$inferSelect)[];
  counterparties: (typeof ammoCounterparty.$inferSelect)[];
  purposeSections: LedgerPrintPurposeData[];
};

export function LedgerPrintDocument({
  ownerName,
  ownerAddress,
  from,
  to,
  guns,
  ranges,
  counterparties,
  purposeSections,
}: LedgerPrintDocumentProps) {
  const orderedSections = ledgerPurposes
    .map((purpose) => purposeSections.find((section) => section.purpose === purpose))
    .filter((section): section is LedgerPrintPurposeData => section !== undefined)
    .filter((section) => section.entries.length > 0);

  if (orderedSections.length === 0) {
    return (
      <div className="ledger-print">
        <LedgerPrintStyles />
        <p className="text-sm text-muted-foreground">指定期間に印刷対象の記録がありません。</p>
      </div>
    );
  }

  return (
    <div className="ledger-print space-y-4">
      <LedgerPrintStyles />

      <div className="no-print mb-4">
        <p className="text-sm text-muted-foreground">
          ブラウザの印刷機能で「PDFに保存」できます。表紙・別紙のあと、記録がある用途の帳簿本体が順に出力されます。
        </p>
      </div>

      <LedgerPrintCover
        ownerName={ownerName}
        ownerAddress={ownerAddress}
        purposes={orderedSections.map((section) => section.purpose)}
        from={from}
        to={to}
      />
      <LedgerPrintGunList guns={guns} />
      <LedgerPrintAddressList ranges={ranges} counterparties={counterparties} />

      {orderedSections.map((section) => (
        <LedgerPrintView
          key={section.purpose}
          entries={section.entries}
          from={from}
          to={to}
          purpose={section.purpose}
          permitBalances={section.permitBalances}
        />
      ))}
    </div>
  );
}

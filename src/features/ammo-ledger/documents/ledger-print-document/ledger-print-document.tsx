import type {
  ammoAcquisitionPermit,
  ammoCounterparty,
  ammoGun,
  ammoLedgerEntry,
  ammoPermitEvent,
  ammoRange,
  ammoType,
} from "@/db/schema/ammo-ledger";
import { LedgerPrintAddressList } from "@/features/ammo-ledger/documents/ledger-print-address-list/ledger-print-address-list";
import { LedgerPrintCover } from "@/features/ammo-ledger/documents/ledger-print-cover/ledger-print-cover";
import { LedgerPrintGunList } from "@/features/ammo-ledger/documents/ledger-print-gun-list/ledger-print-gun-list";
import {
  buildLedgerPrintSections,
  formatLedgerPrintSectionLabel,
} from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-sections/build-ledger-print-sections";
import { LedgerPrintStyles } from "@/features/ammo-ledger/documents/ledger-print-styles/ledger-print-styles";
import { LedgerPrintView } from "@/features/ammo-ledger/documents/ledger-print-view/ledger-print-view";

type LedgerPrintDocumentProps = {
  ownerName: string;
  ownerAddress?: string | null;
  from: string;
  to: string;
  year: number;
  guns: (typeof ammoGun.$inferSelect)[];
  ranges: (typeof ammoRange.$inferSelect)[];
  counterparties: (typeof ammoCounterparty.$inferSelect)[];
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
};

export function LedgerPrintDocument({
  ownerName,
  ownerAddress,
  from,
  to,
  year,
  guns,
  ranges,
  counterparties,
  entries,
  permitEvents,
  permits,
  ammoTypes,
}: LedgerPrintDocumentProps) {
  const today = new Date().toISOString().slice(0, 10);
  const sections = buildLedgerPrintSections({
    entries,
    permitEvents,
    permits,
    ammoTypes,
    from,
    to,
    today,
  });

  if (sections.length === 0) {
    return (
      <div className="ledger-print">
        <LedgerPrintStyles />
        <p className="text-sm text-muted-foreground">{year}年の印刷対象となる記録がありません。</p>
      </div>
    );
  }

  return (
    <div className="ledger-print space-y-4">
      <LedgerPrintStyles />

      <div className="no-print mb-4">
        <p className="text-sm text-muted-foreground">
          ブラウザの印刷機能で「PDFに保存」できます。用紙サイズや向きは印刷ダイアログで選べます。表紙・別紙のあと、許可種別ごとの帳簿本体が順に出力されます。
        </p>
      </div>

      <LedgerPrintCover
        ownerName={ownerName}
        ownerAddress={ownerAddress}
        sectionLabels={sections.map((section) => formatLedgerPrintSectionLabel({ section }))}
        from={from}
        to={to}
      />
      <LedgerPrintGunList guns={guns} />
      <LedgerPrintAddressList ranges={ranges} counterparties={counterparties} />

      {sections.map((section) => (
        <LedgerPrintView
          key={section.key}
          section={section}
          entries={section.entries}
          permitEvents={section.permitEvents}
          permits={permits}
          from={from}
          to={to}
          year={year}
          today={today}
        />
      ))}
    </div>
  );
}

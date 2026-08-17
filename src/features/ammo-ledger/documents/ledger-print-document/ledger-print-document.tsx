import type { ammoGun, ammoLedgerEntry, ammoRange } from "@/db/schema/ammo-ledger";
import { buildCounterpartyReferences } from "@/features/ammo-ledger/documents/build-counterparty-references/build-counterparty-references";
import { LedgerPrintAddressList } from "@/features/ammo-ledger/documents/ledger-print-address-list/ledger-print-address-list";
import { LedgerPrintBody } from "@/features/ammo-ledger/documents/ledger-print-body/ledger-print-body";
import { LedgerPrintCover } from "@/features/ammo-ledger/documents/ledger-print-cover/ledger-print-cover";
import { LedgerPrintGunList } from "@/features/ammo-ledger/documents/ledger-print-gun-list/ledger-print-gun-list";
import { LedgerPrintStyles } from "@/features/ammo-ledger/documents/ledger-print-styles/ledger-print-styles";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import { ledgerPurposeLabels, ledgerPurposes } from "@/features/ammo-ledger/schema/ledger-purpose";

type LedgerPrintDocumentProps = {
  ownerName: string;
  ownerAddress?: string | null;
  from: string;
  to: string;
  year: number;
  guns: (typeof ammoGun.$inferSelect)[];
  ranges: (typeof ammoRange.$inferSelect)[];
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  isPreview?: boolean;
};

function groupEntriesByPurpose({
  entries,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
}): Map<LedgerPurpose, (typeof ammoLedgerEntry.$inferSelect)[]> {
  const grouped = new Map<LedgerPurpose, (typeof ammoLedgerEntry.$inferSelect)[]>();

  for (const entry of entries) {
    const purpose = entry.purpose as LedgerPurpose;
    const list = grouped.get(purpose);
    if (list) {
      list.push(entry);
    } else {
      grouped.set(purpose, [entry]);
    }
  }

  return grouped;
}

export function LedgerPrintDocument({
  ownerName,
  ownerAddress,
  from,
  to,
  year,
  guns,
  ranges,
  entries,
  isPreview = false,
}: LedgerPrintDocumentProps) {
  const entriesByPurpose = groupEntriesByPurpose({ entries });
  const activePurposes = ledgerPurposes.filter(
    (purpose) => (entriesByPurpose.get(purpose)?.length ?? 0) > 0,
  );

  const { references: counterpartyReferences, referenceByKey: counterpartyReferenceByKey } =
    buildCounterpartyReferences({ entries });

  if (activePurposes.length === 0) {
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
      {isPreview ? (
        <div className="ledger-print-preview-watermark" aria-hidden="true">
          未確定プレビュー
        </div>
      ) : null}

      <div className="no-print mb-4">
        <p className="text-sm text-muted-foreground">
          A4横で出力されます。印刷時は「ヘッダーとフッター」をオフにしてください。
        </p>
      </div>

      <LedgerPrintCover
        ownerName={ownerName}
        ownerAddress={ownerAddress}
        purposeLabels={activePurposes.map((p) => ledgerPurposeLabels[p])}
        from={from}
        to={to}
      />
      <LedgerPrintGunList guns={guns} />
      <LedgerPrintAddressList ranges={ranges} counterpartyReferences={counterpartyReferences} />

      {activePurposes.map((purpose) => (
        <LedgerPrintBody
          key={purpose}
          ownerName={ownerName}
          ownerAddress={ownerAddress}
          ledgerPurpose={purpose}
          entries={entriesByPurpose.get(purpose) ?? []}
          counterpartyReferenceByKey={counterpartyReferenceByKey}
          year={year}
          from={from}
          to={to}
        />
      ))}
    </div>
  );
}

export function LedgerPrintStyles() {
  return (
    <style>{`
      @media print {
        @page {
          size: A4 landscape;
          margin: 10mm;
        }
        body * {
          visibility: hidden;
        }
        .ledger-print, .ledger-print * {
          visibility: visible;
        }
        .ledger-print {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .no-print {
          display: none !important;
        }
        .ledger-print-page {
          page-break-after: always;
        }
        .ledger-print-page:last-child {
          page-break-after: auto;
        }
      }
      .ledger-print-page {
        min-height: 180mm;
        padding-bottom: 8mm;
      }
    `}</style>
  );
}

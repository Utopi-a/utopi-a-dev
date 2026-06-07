export function LedgerPrintStyles() {
  return (
    <style>{`
      .ledger-print-table {
        width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: 10px;
      }

      .ledger-print-table thead {
        display: table-header-group;
      }

      .ledger-print-table tr {
        break-inside: avoid;
      }

      .ledger-print-col-date {
        width: 24mm;
      }

      .ledger-print-col-category {
        width: 22mm;
      }

      .ledger-print-col-permit-name {
        width: 28mm;
      }

      .ledger-print-col-quantity {
        width: 16mm;
      }

      .ledger-print-col-permit-balance {
        width: 20mm;
      }

      .ledger-print-col-location {
        width: 55mm;
      }

      .ledger-print-col-counterparty {
        width: 55mm;
      }

      .ledger-print-col-gun {
        width: 57mm;
      }

      .ledger-print-cell {
        border: 1px solid #000;
        padding: 2px 4px;
        vertical-align: top;
      }

      .ledger-print-cell-nowrap {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ledger-print-cell-right {
        text-align: right;
      }

      .ledger-print-cell-clamp {
        overflow: hidden;
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
        word-break: break-all;
      }

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
        .ledger-print-table {
          width: 277mm;
        }
      }
      .ledger-print-page {
        min-height: 180mm;
        padding-bottom: 8mm;
      }
    `}</style>
  );
}

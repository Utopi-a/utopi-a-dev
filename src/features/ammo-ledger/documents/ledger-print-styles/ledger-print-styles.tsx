export function LedgerPrintStyles() {
  return (
    <style>{`
      .ledger-print-table {
        width: 100%;
        max-width: 100%;
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

      /* 左側のコンパクト列は em で最低幅を確保し、右側は % で用紙幅に追従 */
      .ledger-print-col-date {
        width: 6.8em;
      }

      .ledger-print-col-category {
        width: 10em;
      }

      .ledger-print-cell-category {
        white-space: nowrap;
      }

      .ledger-print-col-permit-name {
        width: 7em;
      }

      .ledger-print-col-quantity {
        width: 4.5em;
      }

      .ledger-print-col-permit-balance {
        width: 5.5em;
      }

      .ledger-print-col-location {
        width: 22%;
      }

      .ledger-print-col-counterparty {
        width: 22%;
      }

      .ledger-print-col-gun {
        width: 21%;
      }

      .ledger-print-cell {
        border: 1px solid #000;
        padding: 2px 4px;
        vertical-align: top;
        white-space: normal;
        overflow: visible;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      .ledger-print-cell-right {
        text-align: right;
      }

      @media print {
        @page {
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
          min-height: auto;
          padding-bottom: 0;
        }
        .ledger-print-cover-page {
          min-height: calc(100vh - 20mm);
        }
        .ledger-print-page:last-child {
          page-break-after: auto;
        }
        .ledger-print-table {
          width: 100%;
        }
      }
      .ledger-print-page {
        padding-bottom: 8mm;
      }
    `}</style>
  );
}

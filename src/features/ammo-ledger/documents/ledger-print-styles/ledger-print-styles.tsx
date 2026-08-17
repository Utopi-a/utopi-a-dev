export function LedgerPrintStyles() {
  return (
    <style>{`
      .ledger-print-table {
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
        font-size: 9.5px;
        line-height: 1.3;
      }

      .ledger-print-table thead {
        display: table-header-group;
      }

      .ledger-print-table tr {
        break-inside: avoid;
      }

      .ledger-print-col-no {
        width: 2.8em;
      }

      .ledger-print-col-date {
        width: 6.2em;
      }

      .ledger-print-col-category {
        width: 3.5em;
      }

      .ledger-print-cell-category {
        white-space: nowrap;
      }

      .ledger-print-col-ammo-type {
        width: 9em;
      }

      .ledger-print-col-receive {
        width: 3.5em;
      }

      .ledger-print-col-pay {
        width: 3.5em;
      }

      .ledger-print-col-balance-by-type {
        width: 4.5em;
      }

      .ledger-print-col-total-balance {
        width: 4.5em;
      }

      .ledger-print-col-gun {
        width: 11%;
      }

      .ledger-print-col-remarks {
        /* auto fills remaining width */
      }

      .ledger-print-cell {
        border: 1px solid #444;
        padding: 1.5px 3px;
        vertical-align: top;
        white-space: normal;
        overflow: visible;
        word-break: break-word;
        overflow-wrap: anywhere;
      }

      .ledger-print-cell-right {
        text-align: right;
      }

      .ledger-print-thead-row {
        background-color: #f0f0f0;
      }

      .ledger-print-thead-row th {
        font-weight: 600;
        font-size: 8.5px;
        letter-spacing: 0.02em;
      }

      .ledger-print-thead-info {
        text-align: left;
        padding: 2px 4px;
        font-weight: normal;
        font-size: 9px;
        border: none;
      }

      .ledger-print-thead-title {
        text-align: center;
        padding: 3px 4px;
        font-size: 12px;
        font-weight: bold;
        border: none;
      }

      .ledger-print-preview-watermark {
        position: fixed;
        inset: 45% auto auto 50%;
        z-index: 10;
        transform: translate(-50%, -50%) rotate(-18deg);
        color: rgba(180, 83, 9, 0.18);
        font-size: 44px;
        font-weight: 700;
        white-space: nowrap;
        pointer-events: none;
      }

      .ledger-print-section-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 9.5px;
        line-height: 1.3;
      }

      .ledger-print-section-table th {
        background-color: #f0f0f0;
        border: 1px solid #444;
        padding: 3px 6px;
        font-weight: 600;
        font-size: 9px;
        text-align: left;
      }

      .ledger-print-section-table td {
        border: 1px solid #444;
        padding: 2.5px 6px;
        vertical-align: top;
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

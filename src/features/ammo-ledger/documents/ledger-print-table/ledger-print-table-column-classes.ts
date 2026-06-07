export const ledgerPrintColClass = {
  date: "ledger-print-col-date",
  category: "ledger-print-col-category",
  permitName: "ledger-print-col-permit-name",
  quantity: "ledger-print-col-quantity",
  permitBalance: "ledger-print-col-permit-balance",
  location: "ledger-print-col-location",
  counterparty: "ledger-print-col-counterparty",
  gun: "ledger-print-col-gun",
} as const;

export const ledgerPrintCellClass = {
  date: ledgerPrintColClass.date,
  category: ledgerPrintColClass.category,
  permitName: ledgerPrintColClass.permitName,
  quantity: `${ledgerPrintColClass.quantity} ledger-print-cell-right`,
  permitBalance: `${ledgerPrintColClass.permitBalance} ledger-print-cell-right`,
  location: ledgerPrintColClass.location,
  counterparty: ledgerPrintColClass.counterparty,
  gun: ledgerPrintColClass.gun,
} as const;

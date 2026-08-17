export const ledgerPrintColClass = {
  no: "ledger-print-col-no",
  date: "ledger-print-col-date",
  category: "ledger-print-col-category",
  ammoType: "ledger-print-col-ammo-type",
  receive: "ledger-print-col-receive",
  pay: "ledger-print-col-pay",
  balanceByType: "ledger-print-col-balance-by-type",
  totalBalance: "ledger-print-col-total-balance",
  gun: "ledger-print-col-gun",
  remarks: "ledger-print-col-remarks",
} as const;

export const ledgerPrintCellClass = {
  no: `${ledgerPrintColClass.no} ledger-print-cell-right`,
  date: ledgerPrintColClass.date,
  category: `${ledgerPrintColClass.category} ledger-print-cell-category`,
  ammoType: ledgerPrintColClass.ammoType,
  receive: `${ledgerPrintColClass.receive} ledger-print-cell-right`,
  pay: `${ledgerPrintColClass.pay} ledger-print-cell-right`,
  balanceByType: `${ledgerPrintColClass.balanceByType} ledger-print-cell-right`,
  totalBalance: `${ledgerPrintColClass.totalBalance} ledger-print-cell-right`,
  gun: ledgerPrintColClass.gun,
  remarks: ledgerPrintColClass.remarks,
} as const;

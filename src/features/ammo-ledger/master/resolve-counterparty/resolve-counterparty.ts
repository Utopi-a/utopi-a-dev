export function resolveCounterparty({
  counterpartyName,
  counterpartyAddress,
  master,
}: {
  counterpartyName?: string;
  counterpartyAddress?: string;
  master?: { id: string; name: string; address: string } | null;
}): { name: string; address: string; counterpartyId: string | null } | null {
  if (master) {
    return {
      name: master.name,
      address: master.address,
      counterpartyId: master.id,
    };
  }

  if (counterpartyName && counterpartyAddress) {
    return {
      name: counterpartyName,
      address: counterpartyAddress,
      counterpartyId: null,
    };
  }

  return null;
}

export function matchesNavTarget({
  target,
  current,
}: {
  target: string;
  current: string;
}): boolean {
  if (current === target) {
    return true;
  }

  if (target === "/lab/ammo-ledger/settings" && current.startsWith("/lab/ammo-ledger/settings")) {
    return true;
  }

  if (target === "/lab/ammo-ledger/ledger" && current.startsWith("/lab/ammo-ledger/ledger")) {
    return true;
  }

  if (target === "/lab/ammo-ledger/inventory" && current.startsWith("/lab/ammo-ledger/inventory")) {
    return true;
  }

  return false;
}

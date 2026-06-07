export type AmmoLedgerShellRoute = "home" | "ledger" | "inventory" | "settings-hub";

const clientShellPaths: Record<AmmoLedgerShellRoute, string> = {
  home: "/lab/ammo-ledger",
  ledger: "/lab/ammo-ledger/ledger",
  inventory: "/lab/ammo-ledger/inventory",
  "settings-hub": "/lab/ammo-ledger/settings",
};

export function resolveShellRoute({ path }: { path: string }): AmmoLedgerShellRoute | null {
  if (path === clientShellPaths.home) {
    return "home";
  }
  if (path === clientShellPaths.ledger) {
    return "ledger";
  }
  if (path === clientShellPaths.inventory) {
    return "inventory";
  }
  if (path === clientShellPaths["settings-hub"]) {
    return "settings-hub";
  }
  return null;
}

export function isClientShellNavPath({ path }: { path: string }): boolean {
  return resolveShellRoute({ path }) !== null;
}

export function isWorkspaceShellRoute({ route }: { route: AmmoLedgerShellRoute }): boolean {
  return route === "ledger" || route === "inventory";
}

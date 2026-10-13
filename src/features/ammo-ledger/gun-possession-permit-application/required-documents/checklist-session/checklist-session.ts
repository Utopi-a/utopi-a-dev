export const gunPermitChecklistSessionKey = "ammo-ledger:gun-possession-permit-checklist";

type ChecklistSession = {
  checkedExternalIds: string[];
};

export function loadChecklistSession(): ChecklistSession {
  const raw = sessionStorage.getItem(gunPermitChecklistSessionKey);
  if (!raw) {
    return { checkedExternalIds: [] };
  }

  try {
    const parsed = JSON.parse(raw) as ChecklistSession;
    return {
      checkedExternalIds: Array.isArray(parsed.checkedExternalIds) ? parsed.checkedExternalIds : [],
    };
  } catch {
    return { checkedExternalIds: [] };
  }
}

export function saveChecklistSession({ session }: { session: ChecklistSession }): void {
  sessionStorage.setItem(gunPermitChecklistSessionKey, JSON.stringify(session));
}

export function toggleExternalCheck({
  id,
  checked,
}: {
  id: string;
  checked: boolean;
}): ChecklistSession {
  const session = loadChecklistSession();
  const next = new Set(session.checkedExternalIds);

  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }

  const updated = { checkedExternalIds: [...next] };
  saveChecklistSession({ session: updated });
  return updated;
}

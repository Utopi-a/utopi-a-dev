import type {
  ammoAcquisitionPermit,
  ammoLedgerEntry,
  ammoPermitEvent,
  ammoType,
} from "@/db/schema/ammo-ledger";
import { buildLedgerPrintDisplayRows } from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-display-rows/build-ledger-print-display-rows";
import {
  buildLedgerPrintSectionKey,
  type LedgerPrintSectionKey,
} from "@/features/ammo-ledger/documents/ledger-print-section/build-ledger-print-section-key/build-ledger-print-section-key";
import { computePrintPermitBalance } from "@/features/ammo-ledger/documents/ledger-print-section/compute-print-permit-balance/compute-print-permit-balance";
import { formatLedgerPrintPermitPurposeLabel } from "@/features/ammo-ledger/documents/ledger-print-section/format-ledger-print-permit-purpose-label/format-ledger-print-permit-purpose-label";
import { resolveEntryPermitName } from "@/features/ammo-ledger/documents/ledger-print-section/resolve-entry-permit-name/resolve-entry-permit-name";
import { mapLedgerPurposeToPermitPurpose } from "@/features/ammo-ledger/opening-balance/map-ledger-purpose-to-permit-purpose/map-ledger-purpose-to-permit-purpose";
import type { LedgerCategory } from "@/features/ammo-ledger/schema/ledger-category";
import type { LedgerPurpose } from "@/features/ammo-ledger/schema/ledger-purpose";
import type { PermitEventKind } from "@/features/ammo-ledger/schema/permit-event-kind";

export type LedgerPrintSection = LedgerPrintSectionKey & {
  key: string;
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  permitBalances: Map<string, number>;
};

function isWithinRange({ date, from, to }: { date: string; from: string; to: string }): boolean {
  return date >= from && date <= to;
}

function addSectionKey({
  sectionKeys,
  permitName,
  permitPurpose,
  ledgerPurpose,
}: LedgerPrintSectionKey & {
  sectionKeys: Map<string, LedgerPrintSectionKey>;
}) {
  sectionKeys.set(buildLedgerPrintSectionKey({ permitName, permitPurpose, ledgerPurpose }), {
    permitName,
    permitPurpose,
    ledgerPurpose,
  });
}

function resolveSectionPermitIds({
  permits,
  section,
}: {
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  section: LedgerPrintSectionKey;
}): Set<string> {
  return new Set(
    permits
      .filter(
        (permit) =>
          permit.name === section.permitName &&
          permit.permitPurpose === section.permitPurpose &&
          permit.ledgerPurpose === section.ledgerPurpose,
      )
      .map((permit) => permit.id),
  );
}

function resolveEntrySectionPermitPurpose({
  permitName,
  ledgerPurpose,
  permits,
}: {
  permitName: string;
  ledgerPurpose: LedgerPurpose;
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
}): string {
  const matchingPermits = permits.filter(
    (permit) => permit.name === permitName && permit.ledgerPurpose === ledgerPurpose,
  );

  if (matchingPermits.length === 1) {
    return matchingPermits[0].permitPurpose;
  }

  const defaultPermitPurpose = mapLedgerPurposeToPermitPurpose({ purpose: ledgerPurpose });
  const preferredPermit = matchingPermits.find(
    (permit) => permit.permitPurpose === defaultPermitPurpose,
  );

  if (preferredPermit) {
    return preferredPermit.permitPurpose;
  }

  return matchingPermits[0]?.permitPurpose ?? defaultPermitPurpose;
}

export function buildLedgerPrintSections({
  entries,
  permitEvents,
  permits,
  ammoTypes,
  from,
  to,
}: {
  entries: (typeof ammoLedgerEntry.$inferSelect)[];
  permitEvents: (typeof ammoPermitEvent.$inferSelect)[];
  permits: (typeof ammoAcquisitionPermit.$inferSelect)[];
  ammoTypes: (typeof ammoType.$inferSelect)[];
  from: string;
  to: string;
}): LedgerPrintSection[] {
  const ammoTypeById = new Map(ammoTypes.map((type) => [type.id, type]));
  const sectionKeys = new Map<string, LedgerPrintSectionKey>();

  for (const permit of permits) {
    addSectionKey({
      sectionKeys,
      permitName: permit.name,
      permitPurpose: permit.permitPurpose,
      ledgerPurpose: permit.ledgerPurpose as LedgerPurpose,
    });
  }

  for (const entry of entries) {
    if (!isWithinRange({ date: entry.occurredOn, from, to })) {
      continue;
    }

    const permitName = resolveEntryPermitName({ entry, ammoTypeById });
    if (!permitName) {
      continue;
    }

    const ledgerPurpose = entry.purpose as LedgerPurpose;
    addSectionKey({
      sectionKeys,
      permitName,
      permitPurpose: resolveEntrySectionPermitPurpose({
        permitName,
        ledgerPurpose,
        permits,
      }),
      ledgerPurpose,
    });
  }

  for (const event of permitEvents) {
    if (!event.permitId || !isWithinRange({ date: event.occurredOn, from, to })) {
      continue;
    }

    const permit = permits.find((row) => row.id === event.permitId);
    if (!permit) {
      continue;
    }

    addSectionKey({
      sectionKeys,
      permitName: permit.name,
      permitPurpose: permit.permitPurpose,
      ledgerPurpose: permit.ledgerPurpose as LedgerPurpose,
    });
  }

  const sections = [...sectionKeys.values()].map((section) => {
    const key = buildLedgerPrintSectionKey(section);
    const sectionPermitIds = resolveSectionPermitIds({ permits, section });

    const sectionPermits = permits.filter((permit) => sectionPermitIds.has(permit.id));

    const sectionEntries = entries.filter((entry) => {
      if (entry.purpose !== section.ledgerPurpose) {
        return false;
      }

      const permitName = resolveEntryPermitName({ entry, ammoTypeById });
      if (permitName !== section.permitName) {
        return false;
      }

      const permitPurpose = resolveEntrySectionPermitPurpose({
        permitName,
        ledgerPurpose: section.ledgerPurpose,
        permits,
      });

      return permitPurpose === section.permitPurpose;
    });

    const sectionPermitEvents = permitEvents.filter(
      (event) =>
        event.purpose === section.ledgerPurpose &&
        event.permitId !== null &&
        sectionPermitIds.has(event.permitId),
    );

    const permitBalances = computePrintPermitBalance({
      permitEvents: sectionPermitEvents.map((event) => ({
        occurredOn: event.occurredOn,
        eventKind: event.eventKind as PermitEventKind,
        quantity: event.quantity,
      })),
      ledgerEntries: sectionEntries.map((entry) => ({
        id: entry.id,
        occurredOn: entry.occurredOn,
        dayOrder: entry.dayOrder,
        createdAt: entry.createdAt,
        category: entry.category as LedgerCategory,
        quantity: entry.quantity,
      })),
    });

    return {
      ...section,
      key,
      entries: sectionEntries,
      permitEvents: sectionPermitEvents,
      permits: sectionPermits,
      permitBalances,
    };
  });

  return sections
    .filter((section) => {
      const rows = buildLedgerPrintDisplayRows({
        entries: section.entries,
        permitEvents: section.permitEvents,
        permits,
        permitName: section.permitName,
        permitPurpose: section.permitPurpose,
        ledgerPurpose: section.ledgerPurpose,
        from,
        to,
      });
      return rows.length > 0;
    })
    .sort((a, b) => {
      const purposeCompare = a.ledgerPurpose.localeCompare(b.ledgerPurpose);
      if (purposeCompare !== 0) {
        return purposeCompare;
      }

      const nameCompare = a.permitName.localeCompare(b.permitName, "ja");
      if (nameCompare !== 0) {
        return nameCompare;
      }

      return a.permitPurpose.localeCompare(b.permitPurpose, "ja");
    });
}

export function formatLedgerPrintSectionLabel({
  section,
}: {
  section: Pick<LedgerPrintSection, "permitName" | "permitPurpose">;
}): string {
  const purposeLabel = formatLedgerPrintPermitPurposeLabel({
    permitPurpose: section.permitPurpose,
  });

  return `${section.permitName}（${purposeLabel}）`;
}

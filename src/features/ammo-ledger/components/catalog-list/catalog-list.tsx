"use client";

import { CheckIcon, SearchIcon } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureCounterpartyFromCatalog } from "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog";
import { ensureRangeFromCatalog } from "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog";
import { removeCounterpartyFromMyList } from "@/features/ammo-ledger/catalog/remove-counterparty-from-my-list/remove-counterparty-from-my-list";
import { removeRangeFromMyList } from "@/features/ammo-ledger/catalog/remove-range-from-my-list/remove-range-from-my-list";
import type {
  CatalogEntry,
  CatalogPrefectureGroup,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import { scrollToPrefectureSection } from "@/features/ammo-ledger/catalog/scroll-to-prefecture-section/scroll-to-prefecture-section";
import { CatalogFavoriteButton } from "@/features/ammo-ledger/components/catalog-favorite-button/catalog-favorite-button";
import { CatalogScrollPane } from "@/features/ammo-ledger/components/catalog-scroll-pane/catalog-scroll-pane";
import { PrefectureSectionHeading } from "@/features/ammo-ledger/components/prefecture-section-heading/prefecture-section-heading";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { cn } from "@/lib/cn";

type CatalogListProps = {
  catalogKind: CatalogKind;
  catalogByPrefecture: CatalogPrefectureGroup[];
  favoriteCatalogIds: string[];
  registeredCatalogIds: string[];
  includesRangeCatalog?: boolean;
  className?: string;
};

function resolveEntryCatalogKind({
  entry,
  catalogKind,
}: {
  entry: CatalogEntry;
  catalogKind: CatalogKind;
}): CatalogKind {
  if (entry.catalogSource === "range") {
    return "range";
  }
  if (entry.catalogSource === "gun_shop") {
    return "gun_shop";
  }
  return catalogKind;
}

function resolveMyListAction({
  entry,
  catalogKind,
  includesRangeCatalog,
}: {
  entry: CatalogEntry;
  catalogKind: CatalogKind;
  includesRangeCatalog?: boolean;
}): "range" | "counterparty" {
  const entryCatalogKind = resolveEntryCatalogKind({ entry, catalogKind });
  if (includesRangeCatalog && entryCatalogKind === "range") {
    return "counterparty";
  }
  return entryCatalogKind === "range" ? "range" : "counterparty";
}

function resolveMyListSubject({
  entry,
  catalogKind,
  includesRangeCatalog,
}: {
  entry: CatalogEntry;
  catalogKind: CatalogKind;
  includesRangeCatalog?: boolean;
}): string {
  const entryCatalogKind = resolveEntryCatalogKind({ entry, catalogKind });
  if (entryCatalogKind === "range" && !includesRangeCatalog) {
    return "射撃場";
  }
  if (entryCatalogKind === "range") {
    return "購入先（射撃場）";
  }
  return "購入先";
}

export function CatalogList({
  catalogKind,
  catalogByPrefecture,
  favoriteCatalogIds,
  registeredCatalogIds,
  includesRangeCatalog = false,
  className,
}: CatalogListProps) {
  const [query, setQuery] = useState("");
  const [prefectureFilter, setPrefectureFilter] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState(favoriteCatalogIds);
  const [registeredIds, setRegisteredIds] = useState(registeredCatalogIds);
  const [pendingAction, setPendingAction] = useState<{
    catalogId: string;
    kind: "add" | "remove";
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  const showPrefectureRail = !prefectureFilter && !query;

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return catalogByPrefecture
      .filter((group) => !prefectureFilter || group.prefecture === prefectureFilter)
      .map((group) => ({
        ...group,
        entries: group.entries.filter((entry) => {
          if (!normalizedQuery) {
            return true;
          }

          const haystack = `${entry.name} ${entry.address} ${entry.location}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.entries.length > 0);
  }, [catalogByPrefecture, prefectureFilter, query]);

  const totalCount = useMemo(
    () => filteredGroups.reduce((sum, group) => sum + group.entries.length, 0),
    [filteredGroups],
  );

  function scrollToPrefecture({ prefecture }: { prefecture: string }) {
    scrollToPrefectureSection({ container: scrollRef.current, prefecture });
  }

  function handleAddToMyList({ entry }: { entry: CatalogEntry }) {
    const { catalogId } = entry;
    setError(null);
    setPendingAction({ catalogId, kind: "add" });
    setRegisteredIds((current) =>
      current.includes(catalogId) ? current : [...current, catalogId],
    );

    startTransition(async () => {
      const myListAction = resolveMyListAction({ entry, catalogKind, includesRangeCatalog });
      const result =
        myListAction === "range"
          ? await ensureRangeFromCatalog({ catalogId })
          : await ensureCounterpartyFromCatalog({ catalogId });

      setPendingAction(null);

      if (!result.ok) {
        setRegisteredIds((current) => current.filter((id) => id !== catalogId));
        setError(result.error);
        return;
      }

      showAmmoLedgerToast({
        action: "created",
        subject: resolveMyListSubject({ entry, catalogKind, includesRangeCatalog }),
      });
    });
  }

  function handleRemoveFromMyList({ entry }: { entry: CatalogEntry }) {
    const { catalogId } = entry;
    setError(null);
    setPendingAction({ catalogId, kind: "remove" });
    setRegisteredIds((current) => current.filter((id) => id !== catalogId));

    startTransition(async () => {
      const myListAction = resolveMyListAction({ entry, catalogKind, includesRangeCatalog });
      const result =
        myListAction === "range"
          ? await removeRangeFromMyList({ catalogId })
          : await removeCounterpartyFromMyList({ catalogId });

      setPendingAction(null);

      if (!result.ok) {
        setRegisteredIds((current) =>
          current.includes(catalogId) ? current : [...current, catalogId],
        );
        setError(result.error);
        return;
      }

      showAmmoLedgerToast({
        action: "deleted",
        subject: resolveMyListSubject({ entry, catalogKind, includesRangeCatalog }),
      });
    });
  }

  function renderCatalogEntry({ entry }: { entry: CatalogEntry }) {
    const isRegistered = registeredIds.includes(entry.catalogId);
    const entryPendingAction =
      pendingAction?.catalogId === entry.catalogId && isPending ? pendingAction.kind : null;
    const entryCatalogKind = resolveEntryCatalogKind({ entry, catalogKind });

    return (
      <li key={entry.catalogId} className="flex items-start gap-2 py-3">
        <CatalogFavoriteButton
          catalogKind={entryCatalogKind}
          catalogId={entry.catalogId}
          isFavorite={favoriteIds.includes(entry.catalogId)}
          onFavoriteChange={({ isFavorite }) => {
            setFavoriteIds((current) => {
              if (isFavorite) {
                return current.includes(entry.catalogId) ? current : [...current, entry.catalogId];
              }
              return current.filter((id) => id !== entry.catalogId);
            });
          }}
          className="mt-0.5"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{entry.name}</p>
          <p className="text-xs text-muted-foreground">{entry.address}</p>
          {entry.phone ? <p className="text-xs text-muted-foreground">{entry.phone}</p> : null}
        </div>
        <Button
          type="button"
          variant={isRegistered ? "secondary" : "outline"}
          size="xs"
          disabled={entryPendingAction !== null}
          onClick={() =>
            isRegistered ? handleRemoveFromMyList({ entry }) : handleAddToMyList({ entry })
          }
          className="shrink-0"
        >
          {entryPendingAction === "remove" ? (
            "削除中…"
          ) : entryPendingAction === "add" ? (
            "追加中…"
          ) : isRegistered ? (
            <>
              <CheckIcon className="size-3" />
              マイリストから削除
            </>
          ) : (
            "マイリストに追加"
          )}
        </Button>
      </li>
    );
  }

  function renderPrefectureEntries({ entries }: { entries: CatalogEntry[] }) {
    if (!includesRangeCatalog) {
      return (
        <ul className="divide-y divide-border/40">
          {entries.map((entry) => renderCatalogEntry({ entry }))}
        </ul>
      );
    }

    const gunShops = entries.filter((entry) => entry.catalogSource === "gun_shop");
    const ranges = entries.filter((entry) => entry.catalogSource === "range");

    return (
      <>
        {gunShops.length > 0 ? (
          <div className="mb-4">
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">銃砲店</h3>
            <ul className="divide-y divide-border/40">
              {gunShops.map((entry) => renderCatalogEntry({ entry }))}
            </ul>
          </div>
        ) : null}
        {ranges.length > 0 ? (
          <div>
            <h3 className="mb-1 text-xs font-medium text-muted-foreground">射撃場</h3>
            <ul className="divide-y divide-border/40">
              {ranges.map((entry) => renderCatalogEntry({ entry }))}
            </ul>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <div data-catalog-list className={cn("flex h-dvh flex-col overflow-hidden py-3", className)}>
      <div className="shrink-0 space-y-3 border-b border-border/50 bg-background pb-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前・住所で検索"
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            type="button"
            onClick={() => setPrefectureFilter(null)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
              prefectureFilter === null
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            すべて
          </button>
          {catalogByPrefecture.map((group) => (
            <button
              key={group.prefecture}
              type="button"
              onClick={() =>
                setPrefectureFilter((current) =>
                  current === group.prefecture ? null : group.prefecture,
                )
              }
              className={cn(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                prefectureFilter === group.prefecture
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {group.prefecture}
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">{totalCount}件</p>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>

      <CatalogScrollPane
        scrollRef={scrollRef}
        showPrefectureRail={showPrefectureRail}
        prefectures={catalogByPrefecture.map((group) => group.prefecture)}
        onJumpPrefecture={scrollToPrefecture}
        className="min-h-0 flex-1"
      >
        {filteredGroups.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            条件に一致する項目がありません。
          </p>
        ) : (
          filteredGroups.map((group) => (
            <section key={group.prefecture} data-prefecture={group.prefecture} className="mb-5">
              <PrefectureSectionHeading prefecture={group.prefecture} />
              {renderPrefectureEntries({ entries: group.entries })}
            </section>
          ))
        )}
      </CatalogScrollPane>
    </div>
  );
}

"use client";

import { CheckIcon, SearchIcon } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ensureCounterpartyFromCatalog } from "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog";
import { ensureRangeFromCatalog } from "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog";
import type { CatalogPrefectureGroup } from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import { CatalogFavoriteButton } from "@/features/ammo-ledger/components/catalog-favorite-button/catalog-favorite-button";
import { cn } from "@/lib/cn";

type CatalogListProps = {
  catalogKind: CatalogKind;
  catalogByPrefecture: CatalogPrefectureGroup[];
  favoriteCatalogIds: string[];
  registeredCatalogIds: string[];
};

export function CatalogList({
  catalogKind,
  catalogByPrefecture,
  favoriteCatalogIds,
  registeredCatalogIds,
}: CatalogListProps) {
  const [query, setQuery] = useState("");
  const [prefectureFilter, setPrefectureFilter] = useState<string | null>(null);
  const [favoriteIds, setFavoriteIds] = useState(favoriteCatalogIds);
  const [registeredIds, setRegisteredIds] = useState(registeredCatalogIds);
  const [pendingCatalogId, setPendingCatalogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

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
    const element = scrollRef.current?.querySelector(`[data-prefecture="${prefecture}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddToMyList({ catalogId }: { catalogId: string }) {
    setError(null);
    setPendingCatalogId(catalogId);

    startTransition(async () => {
      const result =
        catalogKind === "range"
          ? await ensureRangeFromCatalog({ catalogId })
          : await ensureCounterpartyFromCatalog({ catalogId });

      setPendingCatalogId(null);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setRegisteredIds((current) =>
        current.includes(catalogId) ? current : [...current, catalogId],
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="名前・住所で検索"
            className="pl-9"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setPrefectureFilter(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
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
                "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
                prefectureFilter === group.prefecture
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {group.prefecture}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">{totalCount}件</p>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex min-h-[50vh] gap-0 rounded-xl border border-border/60">
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {filteredGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              条件に一致する項目がありません。
            </p>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.prefecture} data-prefecture={group.prefecture} className="mb-4">
                <h3 className="sticky top-0 z-10 border-b border-border/40 bg-background py-2 text-sm font-medium">
                  {group.prefecture}
                </h3>
                <ul className="divide-y divide-border/40">
                  {group.entries.map((entry) => {
                    const isRegistered = registeredIds.includes(entry.catalogId);
                    const isAdding = pendingCatalogId === entry.catalogId && isPending;

                    return (
                      <li key={entry.catalogId} className="flex items-start gap-2 py-3">
                        <CatalogFavoriteButton
                          catalogKind={catalogKind}
                          catalogId={entry.catalogId}
                          isFavorite={favoriteIds.includes(entry.catalogId)}
                          onFavoriteChange={({ isFavorite }) => {
                            setFavoriteIds((current) => {
                              if (isFavorite) {
                                return current.includes(entry.catalogId)
                                  ? current
                                  : [...current, entry.catalogId];
                              }
                              return current.filter((id) => id !== entry.catalogId);
                            });
                          }}
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{entry.name}</p>
                          <p className="text-xs text-muted-foreground">{entry.address}</p>
                          {entry.phone ? (
                            <p className="text-xs text-muted-foreground">{entry.phone}</p>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          variant={isRegistered ? "secondary" : "outline"}
                          size="xs"
                          disabled={isRegistered || isAdding}
                          onClick={() => handleAddToMyList({ catalogId: entry.catalogId })}
                          className="shrink-0"
                        >
                          {isRegistered ? (
                            <>
                              <CheckIcon className="size-3" />
                              追加済
                            </>
                          ) : isAdding ? (
                            "追加中…"
                          ) : (
                            "マイリストに追加"
                          )}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {!prefectureFilter && !query ? (
          <nav
            aria-label="都道府県ジャンプ"
            className="flex w-9 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-l border-border/40 py-2 text-[10px] text-muted-foreground"
          >
            {catalogByPrefecture.map((group) => (
              <button
                key={group.prefecture}
                type="button"
                className="w-full px-0.5 py-0.5 hover:text-foreground"
                onClick={() => scrollToPrefecture({ prefecture: group.prefecture })}
              >
                {group.prefecture.replace(/(県|府|道)$/, "").slice(0, 3)}
              </button>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

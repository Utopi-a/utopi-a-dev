"use client";

import { ChevronLeftIcon, ChevronRightIcon, ListIcon } from "lucide-react";
import { useMemo, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ensureCounterpartyFromCatalog } from "@/features/ammo-ledger/catalog/ensure-counterparty-from-catalog/ensure-counterparty-from-catalog";
import { ensureRangeFromCatalog } from "@/features/ammo-ledger/catalog/ensure-range-from-catalog/ensure-range-from-catalog";
import type {
  CatalogEntry,
  MasterPickerData,
  PickerMasterEntry,
} from "@/features/ammo-ledger/catalog/schema/catalog-entry";
import type { CatalogKind } from "@/features/ammo-ledger/catalog/schema/catalog-kind";
import { CatalogFavoriteButton } from "@/features/ammo-ledger/components/catalog-favorite-button/catalog-favorite-button";
import { PickerEntryRow } from "@/features/ammo-ledger/components/picker-entry-row/picker-entry-row";
import { cn } from "@/lib/cn";

type MasterPickerProps = {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  catalogKind: CatalogKind;
  pickerData: MasterPickerData;
  sheetTitle: string;
  manualOption?: { value: string; label: string };
};

type PickerView = "quick" | "catalog";

export function MasterPicker({
  id,
  label,
  required,
  value,
  onChange,
  catalogKind,
  pickerData,
  sheetTitle,
  manualOption,
}: MasterPickerProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PickerView>("quick");
  const [favoriteIds, setFavoriteIds] = useState(pickerData.favoriteCatalogIds);
  const [registeredCatalogIds, setRegisteredCatalogIds] = useState(pickerData.registeredCatalogIds);
  const [resolvedMasters, setResolvedMasters] = useState<PickerMasterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const catalogScrollRef = useRef<HTMLDivElement>(null);

  const allMasters = useMemo(() => {
    const byId = new Map<string, PickerMasterEntry>();
    for (const item of [...pickerData.recent, ...pickerData.registered, ...resolvedMasters]) {
      byId.set(item.id, item);
    }
    return byId;
  }, [pickerData.recent, pickerData.registered, resolvedMasters]);

  const selectedLabel = useMemo(() => {
    if (manualOption && value === manualOption.value) {
      return manualOption.label;
    }

    const master = allMasters.get(value);
    return master?.name ?? "";
  }, [allMasters, manualOption, value]);

  function closePicker() {
    setOpen(false);
    setView("quick");
    setError(null);
  }

  function handleSelectMaster({ master }: { master: PickerMasterEntry }) {
    onChange(master.id);
    closePicker();
  }

  function handleSelectCatalog({ entry }: { entry: CatalogEntry }) {
    setError(null);
    startTransition(async () => {
      const result =
        catalogKind === "range"
          ? await ensureRangeFromCatalog({ catalogId: entry.catalogId })
          : await ensureCounterpartyFromCatalog({ catalogId: entry.catalogId });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      const master: PickerMasterEntry = {
        id: result.id,
        name: entry.name,
        address: entry.address,
        catalogId: entry.catalogId,
      };

      setResolvedMasters((current) => {
        const next = current.filter((item) => item.id !== master.id);
        return [...next, master];
      });
      setRegisteredCatalogIds((current) =>
        current.includes(entry.catalogId) ? current : [...current, entry.catalogId],
      );
      onChange(result.id);
      closePicker();
    });
  }

  function handleManualSelect() {
    if (!manualOption) {
      return;
    }

    onChange(manualOption.value);
    closePicker();
  }

  function scrollToPrefecture({ prefecture }: { prefecture: string }) {
    const element = catalogScrollRef.current?.querySelector(`[data-prefecture="${prefecture}"]`);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderCatalogEntry({ entry }: { entry: CatalogEntry }) {
    const isRegistered = registeredCatalogIds.includes(entry.catalogId);

    return (
      <PickerEntryRow
        key={entry.catalogId}
        name={entry.name}
        subtitle={entry.location}
        leading={
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
          />
        }
        trailing={
          isRegistered ? (
            <span className="shrink-0 text-xs text-muted-foreground">登録済</span>
          ) : null
        }
        onSelect={() => handleSelectCatalog({ entry })}
        disabled={isPending}
      />
    );
  }

  function renderMasterEntry({ master }: { master: PickerMasterEntry }) {
    return (
      <PickerEntryRow
        key={master.id}
        name={master.name}
        subtitle={master.address}
        onSelect={() => handleSelectMaster({ master })}
      />
    );
  }

  const favoriteEntries = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    const fromCatalog = pickerData.catalogByPrefecture
      .flatMap((group) => group.entries)
      .filter((entry) => favoriteSet.has(entry.catalogId));

    const seen = new Set<string>();
    return fromCatalog.filter((entry) => {
      if (seen.has(entry.catalogId)) {
        return false;
      }
      seen.add(entry.catalogId);
      return true;
    });
  }, [favoriteIds, pickerData.catalogByPrefecture]);

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs",
          "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
        )}
      >
        <span className={cn("truncate", !selectedLabel && "text-muted-foreground")}>
          {selectedLabel || "選択してください"}
        </span>
        <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>
      <input
        tabIndex={-1}
        className="sr-only"
        value={value}
        required={required}
        onChange={() => undefined}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex h-[88vh] max-h-[88vh] flex-col gap-0 p-0 sm:max-w-none"
        >
          <SheetHeader className="shrink-0 border-b border-border/50 px-4 py-4 text-left">
            <div className="flex items-center gap-2">
              {view === "catalog" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="戻る"
                  onClick={() => setView("quick")}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
              ) : null}
              <div className="min-w-0 flex-1">
                <SheetTitle>{view === "quick" ? sheetTitle : "全国一覧"}</SheetTitle>
                <SheetDescription className="sr-only">{sheetTitle}</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {view === "quick" ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
              {favoriteEntries.length > 0 ? (
                <section className="mb-4">
                  <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    お気に入り
                  </h3>
                  {favoriteEntries.map((entry) => renderCatalogEntry({ entry }))}
                </section>
              ) : null}

              {pickerData.recent.length > 0 ? (
                <section className="mb-4">
                  <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    最近使った
                  </h3>
                  {pickerData.recent.map((master) => renderMasterEntry({ master }))}
                </section>
              ) : null}

              {pickerData.registered.length > 0 ? (
                <section className="mb-4">
                  <h3 className="sticky top-0 z-10 bg-background py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    登録済み
                  </h3>
                  {pickerData.registered.map((master) => renderMasterEntry({ master }))}
                </section>
              ) : null}

              <section className="mb-2">
                <button
                  type="button"
                  onClick={() => setView("catalog")}
                  className="flex w-full items-center justify-between rounded-lg border border-dashed border-border/80 px-3 py-3 text-left text-sm transition-colors hover:bg-muted/40"
                >
                  <span className="flex items-center gap-2">
                    <ListIcon className="size-4 text-muted-foreground" />
                    全国一覧から選ぶ
                  </span>
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </button>
              </section>

              {manualOption ? (
                <section>
                  <PickerEntryRow name={manualOption.label} onSelect={handleManualSelect} />
                </section>
              ) : null}

              {error ? <p className="py-2 text-sm text-destructive">{error}</p> : null}
            </div>
          ) : (
            <div className="flex min-h-0 flex-1">
              <div ref={catalogScrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-2">
                {pickerData.catalogByPrefecture.map((group) => (
                  <section
                    key={group.prefecture}
                    data-prefecture={group.prefecture}
                    className="mb-4"
                  >
                    <h3 className="sticky top-0 z-10 border-b border-border/40 bg-background py-2 text-sm font-medium">
                      {group.prefecture}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {group.entries.length}件
                      </span>
                    </h3>
                    {group.entries.map((entry) => renderCatalogEntry({ entry }))}
                  </section>
                ))}
              </div>
              <nav
                aria-label="都道府県ジャンプ"
                className="flex w-9 shrink-0 flex-col items-center gap-0.5 overflow-y-auto border-l border-border/40 py-2 text-[10px] text-muted-foreground"
              >
                {pickerData.catalogByPrefecture.map((group) => (
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
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

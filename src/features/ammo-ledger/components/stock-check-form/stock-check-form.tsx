"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldSelect } from "@/features/ammo-ledger/components/field-select";
import { showAmmoLedgerToast } from "@/features/ammo-ledger/feedback/show-ammo-ledger-toast/show-ammo-ledger-toast";
import { createDraftSuggestionsFromDiff } from "@/features/ammo-ledger/inventory/create-draft-from-diff/create-draft-from-diff";
import { createDraftFromDiffAction } from "@/features/ammo-ledger/transactions/create-draft/create-draft-action";

type StockCheckFormProps = {
  items: {
    ammoTypeId: string;
    ammoTypeName: string;
    roundsPerBox: number;
    bookStock: number;
  }[];
};

export function StockCheckForm({ items }: StockCheckFormProps) {
  const router = useRouter();
  const [ammoTypeId, setAmmoTypeId] = useState(items[0]?.ammoTypeId ?? "");
  const [actualRounds, setActualRounds] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const selected = items.find((i) => i.ammoTypeId === ammoTypeId);

  const { diff, suggestions } = useMemo(() => {
    if (!selected || actualRounds === "") {
      return { diff: 0, suggestions: [] };
    }
    return createDraftSuggestionsFromDiff({
      bookStock: selected.bookStock,
      actualStock: Number(actualRounds),
      roundsPerBox: selected.roundsPerBox,
    });
  }, [selected, actualRounds]);

  async function handleCreateDraft(suggestion: (typeof suggestions)[number]) {
    if (!selected) return;
    setIsPending(true);
    setError(null);

    const result = await createDraftFromDiffAction({
      ammoTypeId: selected.ammoTypeId,
      actualRounds: Number(actualRounds),
      inputKind: suggestion.inputKind,
      quantity: suggestion.quantity,
      boxCount: suggestion.boxCount,
    });

    if (!result.ok) {
      setError(result.error);
      setIsPending(false);
      return;
    }

    showAmmoLedgerToast({ action: "created", subject: "記録下書き" });
    router.push(result.redirectPath);
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        弾種マスタを登録してから残弾確認を行ってください。
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <FieldSelect
        id="ammo-type"
        label="弾種"
        value={ammoTypeId}
        onChange={setAmmoTypeId}
        options={items.map((i) => ({
          value: i.ammoTypeId,
          label: `${i.ammoTypeName}（帳簿: ${i.bookStock}発）`,
        }))}
        required
        placeholder=""
      />

      {selected ? (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <p>帳簿上: {selected.bookStock}発</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="actual-rounds">実在庫（発）</Label>
        <Input
          id="actual-rounds"
          type="number"
          min={0}
          value={actualRounds}
          onChange={(e) => setActualRounds(e.target.value)}
        />
      </div>

      {actualRounds !== "" && diff !== 0 ? (
        <div className="space-y-3 rounded-lg border border-border/70 px-4 py-3">
          <p className="text-sm">
            差分:{" "}
            <span className="font-semibold">
              {diff > 0 ? "+" : ""}
              {diff}発
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {diff < 0
              ? `${Math.abs(diff)}発分の未記録がある可能性があります。`
              : `${diff}発分の帳簿上の不足がある可能性があります。`}
          </p>
          <div className="flex flex-col gap-2">
            {suggestions.map((suggestion) => (
              <Button
                key={`${suggestion.inputKind}-${suggestion.label}`}
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => handleCreateDraft(suggestion)}
              >
                {suggestion.label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {diff === 0 && actualRounds !== "" ? (
        <p className="text-sm text-muted-foreground">帳簿と実在庫は一致しています。</p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

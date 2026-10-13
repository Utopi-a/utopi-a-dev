"use client";

import type { FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { packagingDefaults } from "@/features/ammo-ledger/transactions/compute-rounds/compute-rounds";

type PackagingFieldsProps = {
  outerBoxCount: string;
  boxCount: string;
  looseRounds: string;
  onOuterBoxCountChange: (value: string) => void;
  onBoxCountChange: (value: string) => void;
  onLooseRoundsChange: (value: string) => void;
  looseLabel?: string;
  /** 同じ画面に複数のフォームがあるとき、ラベルと入力欄を正しく結び付けるための接頭辞 */
  idPrefix?: string;
};

// 初期値の 0 を消さずに上書き入力できるよう、フォーカス時に全選択する。
function selectAllOnFocus(event: FocusEvent<HTMLInputElement>) {
  event.currentTarget.select();
}

export function PackagingFields({
  outerBoxCount,
  boxCount,
  looseRounds,
  onOuterBoxCountChange,
  onBoxCountChange,
  onLooseRoundsChange,
  looseLabel = "バラ",
  idPrefix,
}: PackagingFieldsProps) {
  const fieldId = (name: string) => (idPrefix ? `${idPrefix}-${name}` : name);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor={fieldId("outer-box-count")}>大箱</Label>
          <Input
            id={fieldId("outer-box-count")}
            type="number"
            min={0}
            inputMode="numeric"
            className="h-11 text-base tabular-nums sm:h-9 sm:text-sm"
            value={outerBoxCount}
            onFocus={selectAllOnFocus}
            onChange={(e) => onOuterBoxCountChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("box-count")}>小箱</Label>
          <Input
            id={fieldId("box-count")}
            type="number"
            min={0}
            inputMode="numeric"
            className="h-11 text-base tabular-nums sm:h-9 sm:text-sm"
            value={boxCount}
            onFocus={selectAllOnFocus}
            onChange={(e) => onBoxCountChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={fieldId("loose-rounds")}>{looseLabel}</Label>
          {/* バラはマイナスで調整できるため、記号を入力できる通常の数値キーボードにする。 */}
          <Input
            id={fieldId("loose-rounds")}
            type="number"
            className="h-11 text-base tabular-nums sm:h-9 sm:text-sm"
            value={looseRounds}
            onFocus={selectAllOnFocus}
            onChange={(e) => onLooseRoundsChange(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        大箱1つ = 小箱{packagingDefaults.smallBoxesPerOuterBox}箱分として計算します。
      </p>
    </div>
  );
}

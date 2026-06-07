"use client";

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
};

export function PackagingFields({
  outerBoxCount,
  boxCount,
  looseRounds,
  onOuterBoxCountChange,
  onBoxCountChange,
  onLooseRoundsChange,
  looseLabel = "バラ",
}: PackagingFieldsProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="outer-box-count">大箱</Label>
          <Input
            id="outer-box-count"
            type="number"
            min={0}
            value={outerBoxCount}
            onChange={(e) => onOuterBoxCountChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="box-count">小箱</Label>
          <Input
            id="box-count"
            type="number"
            min={0}
            value={boxCount}
            onChange={(e) => onBoxCountChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="loose-rounds">{looseLabel}</Label>
          <Input
            id="loose-rounds"
            type="number"
            value={looseRounds}
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

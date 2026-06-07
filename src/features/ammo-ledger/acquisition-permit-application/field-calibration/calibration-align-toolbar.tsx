import type { AlignMode } from "./align-calibration-fields";

type CalibrationAlignToolbarProps = {
  selectedCount: number;
  onAlign: ({ mode }: { mode: AlignMode }) => void;
};

const HORIZONTAL: Array<{ mode: AlignMode; label: string }> = [
  { mode: "left", label: "左揃え" },
  { mode: "center", label: "横中央" },
  { mode: "right", label: "右揃え" },
  { mode: "distribute-horizontal", label: "横均等" },
];

const VERTICAL: Array<{ mode: AlignMode; label: string }> = [
  { mode: "top", label: "上揃え" },
  { mode: "middle", label: "縦中央" },
  { mode: "bottom", label: "下揃え" },
  { mode: "distribute-vertical", label: "縦均等" },
];

export function CalibrationAlignToolbar({ selectedCount, onAlign }: CalibrationAlignToolbarProps) {
  const canAlign = selectedCount >= 2;
  const canDistribute = selectedCount >= 3;

  return (
    <div className="space-y-2 rounded-md border bg-muted/30 p-2">
      <p className="text-xs text-muted-foreground">
        {selectedCount} 件選択（整列は2件以上、均等配置は3件以上）
      </p>
      <div className="flex flex-wrap gap-1">
        {HORIZONTAL.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            disabled={mode.startsWith("distribute") ? !canDistribute : !canAlign}
            className="rounded border bg-background px-2 py-1 text-xs disabled:opacity-40"
            onClick={() => onAlign({ mode })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-1">
        {VERTICAL.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            disabled={mode.startsWith("distribute") ? !canDistribute : !canAlign}
            className="rounded border bg-background px-2 py-1 text-xs disabled:opacity-40"
            onClick={() => onAlign({ mode })}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

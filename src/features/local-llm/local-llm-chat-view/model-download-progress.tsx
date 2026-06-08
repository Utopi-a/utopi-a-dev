import type { DownloadProgress } from "@/features/local-llm/inference-worker/inference-worker-messages";
import { cn } from "@/lib/cn";

type ModelDownloadProgressProps = {
  items: DownloadProgress[];
  className?: string;
};

function formatFileName({ file }: { file: string }) {
  return file.split("/").at(-1) ?? file;
}

export function ModelDownloadProgress({ items, className }: ModelDownloadProgressProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {items.map((item) => {
        const percent =
          item.progress !== undefined && item.total !== undefined && item.total > 0
            ? Math.round((item.progress / item.total) * 100)
            : 0;

        return (
          <li key={item.file} className="space-y-1">
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span className="truncate">{formatFileName({ file: item.file })}</span>
              <span className="shrink-0 tabular-nums">{percent}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${percent}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

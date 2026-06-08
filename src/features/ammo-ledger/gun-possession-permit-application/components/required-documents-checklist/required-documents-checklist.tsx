import type { RequiredDocumentItem } from "../../required-documents/required-document-types";

type RequiredDocumentsChecklistProps = {
  items: RequiredDocumentItem[];
};

const statusLabels: Record<RequiredDocumentItem["status"], string> = {
  required: "必要",
  optional: "任意",
  omittable: "省略可",
  omitted: "省略予定",
};

const sourceLabels: Record<RequiredDocumentItem["source"], string> = {
  generated: "アプリで作成",
  external: "外部取得",
  present_only: "提示のみ",
};

export function RequiredDocumentsChecklist({ items }: RequiredDocumentsChecklistProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">必要書類チェックリスト</h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.label}</span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {statusLabels[item.status]}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {sourceLabels[item.source]}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
            {item.note ? (
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{item.note}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

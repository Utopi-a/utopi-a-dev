"use client";

import { useEffect, useMemo, useState } from "react";
import type { GunPermitApplicationInput } from "../../gun-possession-permit-application-types";
import {
  buildSubmissionChecklist,
  type SubmissionChecklistItem,
  summarizeSubmissionChecklist,
} from "../../required-documents/build-submission-checklist/build-submission-checklist";
import {
  loadChecklistSession,
  toggleExternalCheck,
} from "../../required-documents/checklist-session/checklist-session";

type RequiredDocumentsChecklistProps = {
  input: GunPermitApplicationInput;
  showPrintHints?: boolean;
};

const readinessLabels: Record<NonNullable<SubmissionChecklistItem["readiness"]>, string> = {
  ready: "作成済み",
  partial: "入力不足",
  not_needed: "不要",
  unsupported: "未対応",
};

const requirementLabels: Record<SubmissionChecklistItem["requirement"], string> = {
  required: "必要",
  omittable: "省略可",
  omitted: "省略予定",
};

export function RequiredDocumentsChecklist({
  input,
  showPrintHints = false,
}: RequiredDocumentsChecklistProps) {
  const items = useMemo(() => buildSubmissionChecklist({ input }), [input]);
  const [checkedExternalIds, setCheckedExternalIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const loaded = loadChecklistSession();
    setCheckedExternalIds(new Set(loaded.checkedExternalIds));
  }, []);

  const summary = summarizeSubmissionChecklist({ items, checkedExternalIds });
  const inAppItems = items.filter((item) => item.category === "in_app");
  const externalItems = items.filter(
    (item) => item.category === "external" || item.category === "present",
  );

  function handleExternalToggle({ id, checked }: { id: string; checked: boolean }) {
    const updated = toggleExternalCheck({ id, checked });
    setCheckedExternalIds(new Set(updated.checkedExternalIds));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-sm">
        <p>
          この画面で{" "}
          <strong>
            {summary.inAppReady}/{summary.inAppTotal}
          </strong>{" "}
          件の書類を作成できます。残り{" "}
          <strong>{summary.externalTotal - summary.externalReady}</strong> 件は別途用意が必要です。
        </p>
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">この画面で作成する書類</h3>
        <p className="text-xs text-muted-foreground">
          入力内容をもとに印刷できます。印刷プレビューへ進むと出力できます。
        </p>
        <ul className="space-y-2">
          {inAppItems.map((item) => (
            <ChecklistRow key={item.id} item={item} showPrintHints={showPrintHints} />
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">別途用意する書類</h3>
        <p className="text-xs text-muted-foreground">
          外部で取得・作成する書類です。用意できたらチェックを入れて進捗を管理してください。
        </p>
        <ul className="space-y-2">
          {externalItems.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm"
            >
              <label className="flex cursor-pointer items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={checkedExternalIds.has(item.id)}
                  onChange={(event) =>
                    handleExternalToggle({ id: item.id, checked: event.target.checked })
                  }
                />
                <span className="min-w-0 flex-1">
                  <ChecklistItemHeader item={item} />
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function ChecklistRow({
  item,
  showPrintHints,
}: {
  item: SubmissionChecklistItem;
  showPrintHints: boolean;
}) {
  const readiness = item.readiness ?? "unsupported";

  return (
    <li className="rounded-lg border border-border/70 bg-card/50 px-3 py-2 text-sm">
      <ChecklistItemHeader item={item} />
      {item.readinessNote ? (
        <p
          className={
            readiness === "ready"
              ? "mt-1 text-xs text-emerald-700 dark:text-emerald-400"
              : "mt-1 text-xs text-muted-foreground"
          }
        >
          {item.readinessNote}
        </p>
      ) : null}
      {showPrintHints && item.printSection && readiness === "ready" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {resolvePrintHint({ printSection: item.printSection })}
        </p>
      ) : null}
    </li>
  );
}

function ChecklistItemHeader({ item }: { item: SubmissionChecklistItem }) {
  const readiness = item.readiness;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{item.label}</span>
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
          {requirementLabels[item.requirement]}
        </span>
        {readiness ? (
          <span
            className={
              readiness === "ready"
                ? "rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            }
          >
            {readinessLabels[readiness]}
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
      {item.note ? (
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-400">{item.note}</p>
      ) : null}
    </>
  );
}

function resolvePrintHint({
  printSection,
}: {
  printSection: NonNullable<SubmissionChecklistItem["printSection"]>;
}): string {
  if (printSection === "cohabitants") {
    return "「同居親族書を印刷（片面）」から出力";
  }

  return "「まとめて印刷」ボタンに含まれます（個別印刷は折りたたみ内）";
}

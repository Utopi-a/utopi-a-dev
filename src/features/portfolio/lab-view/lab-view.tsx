import { LabStudioPanel } from "@/features/auth/lab-studio-panel/lab-studio-panel";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { labEntries } from "@/features/portfolio/lab-content";
import { PageHeader } from "@/features/portfolio/page-header/page-header";

const statusLabel = {
  active: "稼働中",
  planned: "予定",
} as const;

export function LabView() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <PageHeader
        title="実験"
        description="認証・ブログ・課金など、個人サイトの裏側の試作を置くエリアです。"
      />

      <div className="border-y border-border py-8">
        <LabStudioPanel />
      </div>

      <ul className="-my-3">
        {labEntries.map((entry) => (
          <li key={entry.id}>
            <EntryRow
              title={entry.title}
              description={entry.description}
              meta={statusLabel[entry.status]}
              href={entry.href}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

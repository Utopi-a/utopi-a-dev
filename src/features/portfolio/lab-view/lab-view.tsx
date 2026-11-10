import { LabStudioPanel } from "@/features/auth/lab-studio-panel/lab-studio-panel";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { labEntries } from "@/features/portfolio/lab-content";

const statusLabel = {
  active: "稼働中",
  planned: "予定",
} as const;

export function LabView() {
  return (
    <>
      <header className="pf-page-head">
        <h1 className="site-title">実験</h1>
        <p className="site-lead">
          認証・ブログ・課金など、個人サイトの裏側の試作を置くエリアです。
        </p>
      </header>

      <LabStudioPanel />

      <ul className="pf-list pf-list-status">
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
    </>
  );
}

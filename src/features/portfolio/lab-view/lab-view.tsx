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
      <div className="pf-section">
        <h1 className="pf-title">実験</h1>
        <p className="pf-lead">認証・ブログ・課金など、個人サイトの裏側の試作を置くエリアです。</p>
      </div>

      <LabStudioPanel />

      <ul className="pf-list">
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

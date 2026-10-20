import { careerEntries, certifications, skillGroups } from "@/features/portfolio/about-content";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";

export function AboutView() {
  return (
    <>
      <h1 className="pf-title">プロフィール</h1>

      <section className="pf-section">
        <h2 className="pf-heading">経歴</h2>
        <ol className="pf-list">
          {careerEntries.map((entry) => (
            <li key={entry.id}>
              <EntryRow title={entry.title} meta={entry.period} />
            </li>
          ))}
        </ol>
      </section>

      <section className="pf-section">
        <h2 className="pf-heading">資格</h2>
        <ul className="pf-tags">
          {certifications.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </section>

      <section className="pf-section">
        <h2 className="pf-heading">スキル</h2>
        <p className="pf-lead">
          開発は AI
          エージェントがいる前提で進めています。下の技術も、エージェントと組んで使うものです。
        </p>
        <dl className="pf-skills">
          {skillGroups.map((group) => (
            <div key={group.name} className="pf-skill-group">
              <dt className="pf-skill-name">{group.name}</dt>
              <dd className="pf-skill-tags">
                <ul className="pf-tags">
                  {group.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}

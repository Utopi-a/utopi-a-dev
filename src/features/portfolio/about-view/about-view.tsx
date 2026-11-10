import { careerEntries, certifications, skillGroups } from "@/features/portfolio/about-content";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";

export function AboutView() {
  return (
    <>
      <header className="pf-page-head">
        <h1 className="site-title">プロフィール</h1>
      </header>

      <section className="pf-section">
        <h2 className="site-heading">経歴</h2>
        <div className="pf-section-body">
          <ol className="pf-list">
            {careerEntries.map((entry) => (
              <li key={entry.id}>
                <EntryRow title={entry.title} meta={entry.period} />
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="pf-section">
        <h2 className="site-heading">資格</h2>
        <div className="pf-section-body">
          <ul className="pf-tags">
            {certifications.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="pf-section">
        <h2 className="site-heading">スキル</h2>
        <div className="pf-section-body">
          <p className="site-lead">
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
        </div>
      </section>
    </>
  );
}

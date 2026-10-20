import { careerEntries, certifications, skills } from "@/features/portfolio/about-content";
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
        <ul className="pf-list">
          {skills.map((skill) => (
            <li key={skill.name} className="pf-entry">
              <span className="pf-entry-title">{skill.name}</span>
              <span className="pf-entry-description">{skill.summary}</span>
              {skill.tags ? (
                <ul className="pf-tags mt-2 text-sm" aria-label={`${skill.name} の関連技術`}>
                  {skill.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

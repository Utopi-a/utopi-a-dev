import { careerEntries, certifications, skills } from "@/features/portfolio/about-content";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { LabeledSection } from "@/features/portfolio/labeled-section/labeled-section";
import { PageHeader } from "@/features/portfolio/page-header/page-header";

export function AboutView() {
  return (
    <div className="flex flex-col gap-14 sm:gap-16">
      <PageHeader title="プロフィール" className="mb-2 sm:mb-4" />

      <LabeledSection title="経歴">
        <ol className="-my-3">
          {careerEntries.map((entry) => (
            <li key={entry.id}>
              <EntryRow title={entry.title} meta={entry.period} />
            </li>
          ))}
        </ol>
      </LabeledSection>

      <LabeledSection title="資格">
        <ul className="grid gap-x-8 gap-y-2 sm:grid-cols-2">
          {certifications.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </LabeledSection>

      <LabeledSection title="スキル">
        <ul className="-my-3">
          {skills.map((skill) => (
            <li key={skill.name} className="py-3">
              <p className="font-bold">{skill.name}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{skill.summary}</p>
              {skill.tags ? (
                <ul
                  className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm"
                  aria-label={`${skill.name} の関連技術`}
                >
                  {skill.tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </LabeledSection>
    </div>
  );
}

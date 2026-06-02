import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { careerEntries, certifications, skills } from "@/features/portfolio/about-content";
import { PageHeader } from "@/features/portfolio/page-header/page-header";

export function AboutView() {
  return (
    <div className="flex flex-col gap-12 sm:gap-16">
      <PageHeader eyebrow="About" title="プロフィール" />

      <section className="space-y-6">
        <h2 className="text-lg font-semibold tracking-tight">経歴</h2>
        <ol className="relative space-y-0 border-l border-border/80 pl-6">
          {careerEntries.map((entry) => (
            <li key={entry.id} className="pb-8 last:pb-0">
              <span
                className="absolute -left-[5px] mt-1.5 size-2.5 rounded-full border-2 border-background bg-primary"
                aria-hidden
              />
              <p className="text-xs font-medium tracking-wide text-primary">{entry.period}</p>
              <p className="mt-1 text-sm leading-relaxed sm:text-base">{entry.title}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">資格</h2>
        <ul className="flex flex-wrap gap-2">
          {certifications.map((name) => (
            <li key={name}>
              <Badge variant="secondary" className="rounded-full px-3 py-1 font-normal">
                {name}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">スキル</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {skills.map((skill) => (
            <li key={skill.name}>
              <Card className="h-full gap-4 border-border/70 bg-card/70 py-5 shadow-sm">
                <CardHeader className="px-5 pb-0">
                  <CardTitle className="text-base">{skill.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-5">
                  <p className="text-sm text-muted-foreground">{skill.summary}</p>
                  {skill.tags ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {skill.tags.map((tag) => (
                        <li key={tag}>
                          <Badge variant="outline" className="rounded-full font-normal">
                            {tag}
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

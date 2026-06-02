import { aboutSections } from "@/features/portfolio/about-content";
import { PageIntro } from "@/features/portfolio/page-intro/page-intro";
import { ProfileHero } from "@/features/portfolio/profile-hero/profile-hero";

function SectionHeading({ children }: { children: string }) {
  return (
    <h2 className="border-b border-border/70 pb-3 text-center text-lg font-semibold tracking-tight sm:text-xl">
      {children}
    </h2>
  );
}

export function AboutView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 sm:gap-14">
      <ProfileHero subtitle="プロフィール" variant="page" />
      <PageIntro label="About" className="sr-only" />

      <div className="flex flex-col gap-12 sm:gap-16">
        {aboutSections.map((section) => {
          if (section.type === "list") {
            return (
              <section key={section.id} className="space-y-5">
                <SectionHeading>{section.title}</SectionHeading>
                <ul className="space-y-3 pl-5 text-sm leading-relaxed text-foreground/90 sm:text-base">
                  {section.items.map((item) => (
                    <li key={item} className="list-disc marker:text-primary/70">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            );
          }

          return (
            <section key={section.id} className="space-y-6">
              <SectionHeading>{section.title}</SectionHeading>
              <ul className="space-y-8">
                {section.items.map((skill) => (
                  <li key={skill.name} className="space-y-2">
                    <h3 className="text-base font-semibold sm:text-lg">{skill.name}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                      {skill.description}
                    </p>
                    {skill.related ? (
                      <ul className="flex flex-wrap gap-2 pt-1">
                        {skill.related.map((tag) => (
                          <li
                            key={tag}
                            className="rounded-full border border-border/80 bg-muted/80 px-2.5 py-0.5 text-xs text-muted-foreground"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

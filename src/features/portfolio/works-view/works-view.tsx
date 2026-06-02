import { PageIntro } from "@/features/portfolio/page-intro/page-intro";
import { ProfileHero } from "@/features/portfolio/profile-hero/profile-hero";
import { workItems } from "@/features/portfolio/works";
import { cn } from "@/lib/cn";

export function WorksView() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 sm:gap-14">
      <ProfileHero subtitle="制作物一覧" variant="page" />
      <PageIntro label="Works" className="sr-only" />

      <ul className="flex flex-col gap-6 sm:gap-8">
        {workItems.map((work) => (
          <li key={work.id}>
            <article
              className={cn(
                "group rounded-2xl border border-border/80 bg-card/70 p-6 shadow-sm transition-colors",
                "hover:border-primary/25 hover:bg-card",
              )}
            >
              <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
                <a
                  href={work.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline-offset-4 transition-colors hover:text-primary hover:underline"
                >
                  {work.title}
                </a>
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                {work.description}
              </p>
              <p className="mt-4">
                <a
                  href={work.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  サイトを見る →
                </a>
              </p>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}

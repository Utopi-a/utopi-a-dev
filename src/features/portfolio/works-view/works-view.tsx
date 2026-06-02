import { ArrowUpRightIcon } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { workItems } from "@/features/portfolio/works";

export function WorksView() {
  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <PageHeader eyebrow="Works" title="制作物" />

      <ul className="grid gap-5">
        {workItems.map((work) => (
          <li key={work.id}>
            <Card className="group gap-0 overflow-hidden border-border/70 bg-card/70 py-0 shadow-sm transition-colors hover:border-primary/25 hover:bg-card">
              <CardHeader className="px-6 pt-6 pb-4">
                <CardTitle className="text-xl">
                  <a
                    href={work.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-2 hover:text-primary"
                  >
                    <span>{work.title}</span>
                    <ArrowUpRightIcon className="mt-1 size-4 shrink-0 opacity-60 transition-opacity group-hover:opacity-100" />
                  </a>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-6 pb-4">
                <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {work.description}
                </p>
              </CardContent>
              <CardFooter className="border-t border-border/60 px-6 py-4">
                <a
                  href={work.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  サイトを開く
                </a>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

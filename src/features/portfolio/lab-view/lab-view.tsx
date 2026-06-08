import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LabStudioPanel } from "@/features/auth/lab-studio-panel/lab-studio-panel";
import { labEntries } from "@/features/portfolio/lab-content";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { cn } from "@/lib/cn";

const statusLabel = {
  active: "稼働中",
  planned: "予定",
} as const;

export function LabView() {
  return (
    <div className="flex flex-col gap-10 sm:gap-12">
      <PageHeader
        eyebrow="Lab"
        title="実験"
        description="認証・ブログ・課金など、個人サイトの裏側の試作を置くエリアです。"
      />

      <LabStudioPanel />

      <ul className="grid gap-4 sm:grid-cols-2">
        {labEntries.map((entry) => {
          const card = (
            <Card
              className={cn(
                "h-full gap-4 border-border/70 bg-card/70 py-5 shadow-sm",
                entry.href && "transition-colors hover:border-primary/40 hover:bg-card",
              )}
            >
              <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 px-5 pb-0">
                <CardTitle className="text-base leading-snug">{entry.title}</CardTitle>
                <Badge
                  variant={entry.status === "active" ? "default" : "secondary"}
                  className={cn("shrink-0 rounded-full font-normal")}
                >
                  {statusLabel[entry.status]}
                </Badge>
              </CardHeader>
              <CardContent className="px-5">
                <p className="text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
              </CardContent>
            </Card>
          );

          return (
            <li key={entry.id}>
              {entry.href ? (
                <Link
                  href={entry.href}
                  className="block h-full rounded-xl focus-visible:outline-none"
                >
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

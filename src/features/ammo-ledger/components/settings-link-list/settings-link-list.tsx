import Link from "next/link";
import { cn } from "@/lib/cn";

type SettingsLinkItem = {
  readonly href: string;
  readonly label: string;
  readonly description: string;
};

type SettingsLinkGroup = {
  readonly title: string;
  readonly items: readonly SettingsLinkItem[];
};

type SettingsLinkListProps = {
  groups: readonly SettingsLinkGroup[];
};

export function SettingsLinkList({ groups }: SettingsLinkListProps) {
  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h2 className="px-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {group.title}
          </h2>
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/40">
            {group.items.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-muted/40",
                  index > 0 && "border-t border-border/50",
                )}
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {item.description}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-muted-foreground">
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

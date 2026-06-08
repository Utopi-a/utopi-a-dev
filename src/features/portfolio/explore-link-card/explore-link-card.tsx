import { ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type ExploreLinkCardProps = {
  href: string;
  label: string;
};

export function ExploreLinkCard({ href, label }: ExploreLinkCardProps) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "group flex items-center justify-between gap-4 rounded-2xl border border-border/70",
        "bg-card/60 px-5 py-4 shadow-sm backdrop-blur-sm transition-all sm:px-6 sm:py-5",
        "hover:border-primary/30 hover:bg-card hover:shadow-md",
      )}
    >
      <span className="text-lg font-semibold tracking-tight">{label}</span>
      <ArrowUpRightIcon
        className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
        aria-hidden
      />
    </Link>
  );
}

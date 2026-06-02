import { cn } from "@/lib/cn";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  className?: string;
};

export function PageHeader({ eyebrow, title, description, className }: PageHeaderProps) {
  return (
    <header className={cn("space-y-3", className)}>
      <p className="text-xs font-medium tracking-[0.22em] text-primary uppercase">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h1>
      {description ? (
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">
          {description}
        </p>
      ) : null}
    </header>
  );
}

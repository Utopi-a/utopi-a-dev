import { cn } from "@/lib/cn";

type PageIntroProps = {
  label: string;
  title?: string;
  description?: string;
  className?: string;
};

export function PageIntro({ label, title, description, className }: PageIntroProps) {
  return (
    <header className={cn("space-y-2 border-b border-border/60 pb-6 sm:pb-8", className)}>
      <p className="text-xs font-medium tracking-[0.2em] text-primary uppercase sm:text-sm">
        {label}
      </p>
      {title ? (
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      ) : null}
      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          {description}
        </p>
      ) : null}
    </header>
  );
}

import { ChevronRightIcon, MapIcon } from "lucide-react";
import Link from "next/link";

type CatalogBrowsePromoProps = {
  href: string;
  title: string;
  description: string;
  countLabel: string;
};

export function CatalogBrowsePromo({
  href,
  title,
  description,
  countLabel,
}: CatalogBrowsePromoProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 border-b border-border/60 py-4 transition-colors hover:text-primary"
    >
      <MapIcon className="size-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-1 text-xs text-muted-foreground">{countLabel}</p>
      </div>
      <ChevronRightIcon className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}

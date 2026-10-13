import { socialLinks } from "@/features/portfolio/site-config";
import { SocialBrandIcon } from "@/features/portfolio/social-icons/social-brand-icon";
import { cn } from "@/lib/cn";

type SocialLinksProps = {
  className?: string;
};

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <ul className={cn("-ml-2 flex items-center gap-1", className)}>
      {socialLinks.map(({ href, label, icon }) => (
        <li key={href}>
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <SocialBrandIcon icon={icon} className="size-4 text-current" />
          </a>
        </li>
      ))}
    </ul>
  );
}

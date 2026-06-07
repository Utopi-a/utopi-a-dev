import Link from "next/link";
import { socialLinks } from "@/features/portfolio/site-config";
import { SocialBrandIcon } from "@/features/portfolio/social-icons/social-brand-icon";
import { cn } from "@/lib/cn";

type SocialLinksProps = {
  size?: "sm" | "md";
  className?: string;
};

export function SocialLinks({ size = "md", className }: SocialLinksProps) {
  const buttonClass = size === "sm" ? "size-9 rounded-lg" : "size-11 rounded-xl sm:size-12";

  const iconClass = size === "sm" ? "size-4" : "size-5 sm:size-6";

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3", className)}>
      {socialLinks.map(({ href, label, icon }) => (
        <Link
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cn(
            "inline-flex items-center justify-center border border-border/70 bg-card/80 shadow-sm transition-all",
            "hover:border-primary/30 hover:bg-card hover:shadow-md",
            buttonClass,
          )}
        >
          <SocialBrandIcon icon={icon} className={iconClass} />
        </Link>
      ))}
    </div>
  );
}

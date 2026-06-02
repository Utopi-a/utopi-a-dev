import Image from "next/image";
import Link from "next/link";
import { siteProfile, socialLinks } from "@/features/portfolio/site-config";
import { cn } from "@/lib/cn";

type ProfileHeroProps = {
  subtitle?: string;
  variant?: "home" | "page";
};

export function ProfileHero({ subtitle, variant = "home" }: ProfileHeroProps) {
  const isHome = variant === "home";

  return (
    <section
      className={cn(
        "flex flex-col items-center text-center",
        isHome ? "gap-8 sm:gap-10" : "gap-5 sm:gap-6",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-full border-4 border-card shadow-xl",
          isHome ? "size-32 sm:size-44" : "size-24 sm:size-28",
        )}
        style={{ boxShadow: isHome ? "0 16px 48px var(--brand-glow)" : undefined }}
      >
        <Image
          src={siteProfile.avatarSrc}
          alt={siteProfile.avatarAlt}
          width={400}
          height={400}
          priority={isHome}
          className="size-full object-cover"
        />
      </div>

      <div className="space-y-2">
        <h1
          className={cn(
            "font-semibold tracking-tight",
            isHome ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
          )}
        >
          {siteProfile.name}
        </h1>
        <p className={cn("text-muted-foreground", isHome ? "text-lg sm:text-xl" : "text-base")}>
          {subtitle ?? siteProfile.homeTagline}
        </p>
      </div>

      {isHome ? (
        <div className="flex items-center gap-5 sm:gap-8">
          {socialLinks.map(({ href, label, iconSrc }) => (
            <Link
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex size-11 items-center justify-center rounded-full border border-border/80 bg-card/90 shadow-sm transition-colors hover:border-primary/35 hover:bg-card sm:size-12"
              aria-label={label}
            >
              <Image src={iconSrc} alt="" width={28} height={28} className="size-7 sm:size-8" />
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

import Image from "next/image";
import { ExploreLinkCard } from "@/features/portfolio/explore-link-card/explore-link-card";
import { exploreLinks, siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";

export function HomeView() {
  return (
    <div className="flex w-full flex-col gap-14 sm:gap-20">
      <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-14">
        <div className="flex flex-col gap-6 sm:gap-8">
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {siteProfile.name}
          </h1>
          <SocialLinks />
        </div>

        <div className="mx-auto w-full max-w-xs lg:mx-0 lg:max-w-sm">
          <div
            className="relative overflow-hidden rounded-3xl border border-border/80 bg-card/80 p-2 shadow-xl"
            style={{ boxShadow: "0 24px 64px var(--brand-glow)" }}
          >
            <Image
              src={siteProfile.avatarSrc}
              alt={siteProfile.avatarAlt}
              width={400}
              height={400}
              priority
              className="aspect-square w-full rounded-[1.25rem] object-cover"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-medium tracking-wide text-muted-foreground">Explore</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {exploreLinks.map((link) => (
            <ExploreLinkCard key={link.href} href={link.href} label={link.label} />
          ))}
        </div>
      </section>
    </div>
  );
}

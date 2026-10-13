import Image from "next/image";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { LabeledSection } from "@/features/portfolio/labeled-section/labeled-section";
import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { workItems } from "@/features/portfolio/works";

export function HomeView() {
  return (
    <div className="flex flex-col gap-20 sm:gap-24">
      <section className="flex flex-col gap-6 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-700">
        <div className="flex items-center gap-4 sm:gap-6">
          <Image
            src={siteProfile.avatarSrc}
            alt=""
            width={96}
            height={96}
            priority
            fetchPriority="high"
            sizes="(min-width: 640px) 80px, 56px"
            className="size-14 shrink-0 rounded-full bg-muted ring-1 ring-border sm:size-20"
          />
          <h1 className="text-5xl leading-none font-extrabold tracking-[-0.04em] sm:text-7xl">
            {siteProfile.name}
          </h1>
        </div>
        <SocialLinks />
      </section>

      <LabeledSection title="制作物">
        <ul className="-my-3">
          {workItems.map((work) => (
            <li key={work.id}>
              <EntryRow title={work.title} description={work.description} href={work.href} />
            </li>
          ))}
        </ul>
      </LabeledSection>
    </div>
  );
}

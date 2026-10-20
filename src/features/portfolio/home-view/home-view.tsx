import Image from "next/image";
import { EntryRow } from "@/features/portfolio/entry-row/entry-row";
import { NameVariants } from "@/features/portfolio/name-variants/name-variants";
import { siteProfile } from "@/features/portfolio/site-config";
import { SocialLinks } from "@/features/portfolio/social-links/social-links";
import { workItems } from "@/features/portfolio/works";

export function HomeView() {
  return (
    <>
      <section className="pf-hero">
        <h1 className="pf-name">
          <NameVariants variants={[siteProfile.name, "ユートピア", "utopi-a"]} />
        </h1>
        <div className="pf-signs">
          <Image
            src={siteProfile.avatarSrc}
            alt=""
            width={104}
            height={104}
            priority
            className="pf-avatar"
          />
          <SocialLinks />
        </div>
      </section>

      <section className="pf-section">
        <h2 className="pf-heading">制作物</h2>
        <ul className="pf-list">
          {workItems.map((work) => (
            <li key={work.id}>
              <EntryRow title={work.title} description={work.description} href={work.href} />
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

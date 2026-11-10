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
        <Image
          src={siteProfile.avatarSrc}
          alt=""
          width={576}
          height={576}
          // 幅を書かないと 1x・2x しか候補が出ないので、表示幅を渡して 3x の画面にも高解像度を選ばせる
          sizes="(min-width: 64rem) 12rem, 7rem"
          priority
          className="pf-avatar"
        />
        <div className="pf-hero-text">
          <h1 className="pf-name">
            <NameVariants variants={[siteProfile.name, "ユートピア", "utopi-a"]} />
          </h1>
          <SocialLinks />
        </div>
      </section>

      <section className="pf-section">
        <h2 className="site-heading">制作物</h2>
        <div className="pf-section-body">
          <ul className="pf-list">
            {workItems.map((work) => (
              <li key={work.id}>
                <EntryRow title={work.title} description={work.description} href={work.href} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

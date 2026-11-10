"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Suspense } from "react";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { type JustifiedItem, justifyRows } from "./justified-rows";
import { openPhotoInViewer, PhotoLightbox } from "./photo-lightbox";
import { photoAltText, photoSrcSet } from "./photo-text";

// 行の分け方を決める基準の寸法。幅は各画面幅の代表の値で、実際の幅にはこの比率のまま伸び縮みする。
// スマホは 1 枚を大きく見せたいので、横長が 1 行に 1 枚になる高さを目標にする
const GAP_REM = 0.5;
const GAP_PX = 8;
const layouts = {
  phone: { containerWidth: 343, targetRowHeight: 230, gap: GAP_PX },
  tablet: { containerWidth: 720, targetRowHeight: 200, gap: GAP_PX },
  desktop: { containerWidth: 1088, targetRowHeight: 260, gap: GAP_PX },
} as const;

function layoutVariables({
  item,
  ratio,
  name,
}: {
  item: JustifiedItem;
  ratio: number;
  name: string;
}) {
  return {
    [`--basis-${name}`]: `calc((100% - ${item.gapsInRow * GAP_REM}rem) * ${item.share})`,
    [`--grow-${name}`]: item.fillsRow ? ratio * 100 : 0,
  };
}

function gridImageSizes({ phone, tablet, desktop }: Record<keyof typeof layouts, JustifiedItem>) {
  const viewportWidth = (item: JustifiedItem) => `${Math.ceil(item.share * 100)}vw`;
  return `(min-width: 64rem) ${Math.ceil(desktop.share * layouts.desktop.containerWidth)}px, (min-width: 40rem) ${viewportWidth(tablet)}, ${viewportWidth(phone)}`;
}

function shouldLetBrowserHandle({ event }: { event: MouseEvent }) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const ratios = photos.map((photo) => photo.width / photo.height);
  const phoneItems = justifyRows({ ratios, layout: layouts.phone });
  const tabletItems = justifyRows({ ratios, layout: layouts.tablet });
  const desktopItems = justifyRows({ ratios, layout: layouts.desktop });

  return (
    <>
      <ul className="gallery-grid">
        {photos.map((photo, index) => {
          const ratio = ratios[index];
          const phone = phoneItems[index];
          const tablet = tabletItems[index];
          const desktop = desktopItems[index];
          return (
            <li
              key={photo.id}
              className="gallery-item"
              style={
                {
                  "--ratio": ratio,
                  ...layoutVariables({ item: phone, ratio, name: "phone" }),
                  ...layoutVariables({ item: tablet, ratio, name: "tablet" }),
                  ...layoutVariables({ item: desktop, ratio, name: "desktop" }),
                } as CSSProperties
              }
            >
              <a
                href={`?photo=${encodeURIComponent(photo.id)}`}
                className="gallery-link"
                onClick={(event) => {
                  if (shouldLetBrowserHandle({ event })) {
                    return;
                  }
                  event.preventDefault();
                  openPhotoInViewer({ id: photo.id });
                }}
              >
                <img
                  className="gallery-image"
                  src={photo.variants[0]?.url}
                  srcSet={photoSrcSet({ photo })}
                  sizes={gridImageSizes({ phone, tablet, desktop })}
                  width={photo.width}
                  height={photo.height}
                  alt={photoAltText({ photo })}
                  loading="lazy"
                  decoding="async"
                />
              </a>
            </li>
          );
        })}
      </ul>
      {/* useSearchParams を使う拡大表示だけを Suspense で包み、一覧はサーバーで描いたまま出す */}
      <Suspense fallback={null}>
        <PhotoLightbox photos={photos} />
      </Suspense>
    </>
  );
}

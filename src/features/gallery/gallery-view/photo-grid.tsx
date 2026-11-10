"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Suspense } from "react";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { type MasonryLayout, type MasonryTile, placeMasonryTiles } from "./masonry-layout";
import { openPhotoInViewer, PhotoLightbox } from "./photo-lightbox";
import { photoAltText, photoSrcSet } from "./photo-text";

// 列の数は gallery.css と揃える。幅は各画面幅の代表の値で、実際の幅にはこの比率のまま伸び縮みする。
const layouts = {
  phone: { columns: 2, columnWidth: 167.5, gap: 8, placement: "pairs" },
  tablet: { columns: 2, columnWidth: 356, gap: 8, placement: "shortest-column" },
  desktop: { columns: 3, columnWidth: 357.33, gap: 8, placement: "shortest-column" },
} as const satisfies Record<string, MasonryLayout>;

function tileVariables({ tile, name }: { tile: MasonryTile; name: keyof typeof layouts }) {
  return {
    [`--column-${name}`]: `${tile.column} / span ${tile.columnSpan}`,
    [`--row-${name}`]: `${tile.row} / span ${tile.rowSpan}`,
  };
}

function gridImageSizes({ phone }: { phone: MasonryTile }) {
  const desktopWidth = Math.ceil(layouts.desktop.columnWidth);
  const phoneWidth = phone.columnSpan === layouts.phone.columns ? "100vw" : "50vw";
  return `(min-width: 64rem) ${desktopWidth}px, (min-width: 40rem) 50vw, ${phoneWidth}`;
}

function shouldLetBrowserHandle({ event }: { event: MouseEvent }) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const ratios = photos.map((photo) => photo.width / photo.height);
  const phoneTiles = placeMasonryTiles({ ratios, layout: layouts.phone });
  const tabletTiles = placeMasonryTiles({ ratios, layout: layouts.tablet });
  const desktopTiles = placeMasonryTiles({ ratios, layout: layouts.desktop });

  return (
    <>
      <div className="gallery-mosaic">
        <ul className="gallery-grid">
          {photos.map((photo, index) => {
            const phone = phoneTiles[index];
            const tablet = tabletTiles[index];
            const desktop = desktopTiles[index];
            return (
              <li
                key={photo.id}
                className="gallery-item"
                style={
                  {
                    ...tileVariables({ tile: phone, name: "phone" }),
                    ...tileVariables({ tile: tablet, name: "tablet" }),
                    ...tileVariables({ tile: desktop, name: "desktop" }),
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
                    sizes={gridImageSizes({ phone })}
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
      </div>
      {/* useSearchParams を使う拡大表示だけを Suspense で包み、一覧はサーバーで描いたまま出す */}
      <Suspense fallback={null}>
        <PhotoLightbox photos={photos} />
      </Suspense>
    </>
  );
}

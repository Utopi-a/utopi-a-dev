"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Suspense } from "react";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { type MosaicLayout, type MosaicTile, placeMosaicTiles } from "./mosaic-layout";
import { openPhotoInViewer, PhotoLightbox } from "./photo-lightbox";
import { photoAltText, photoSrcSet } from "./photo-text";

// 列の数と段の刻みは gallery.css と揃える。幅は各画面幅の代表の値で、実際の幅にはこの比率のまま伸び縮みする。
const wideScreenSpans = {
  slim: [3, 3],
  tall: [3, 6],
  square: [3, 6],
  wide: [4, 8],
  panorama: [12, 12],
} as const;

const layouts = {
  phone: {
    columns: 6,
    columnWidth: 50.5,
    gap: 8,
    rowUnitsPerColumn: 6,
    sizing: "pairs",
    spans: { slim: [3, 3], tall: [3, 6], square: [3, 6], wide: [6, 6], panorama: [6, 6] },
  },
  tablet: {
    columns: 12,
    columnWidth: 52.7,
    gap: 8,
    rowUnitsPerColumn: 6,
    sizing: "rhythm",
    spans: wideScreenSpans,
  },
  desktop: {
    columns: 12,
    columnWidth: 83.33,
    gap: 8,
    rowUnitsPerColumn: 12,
    sizing: "rhythm",
    spans: wideScreenSpans,
  },
} as const satisfies Record<string, MosaicLayout>;

function tileVariables({ tile, name }: { tile: MosaicTile; name: keyof typeof layouts }) {
  return {
    [`--column-${name}`]: `${tile.column} / span ${tile.columnSpan}`,
    [`--row-${name}`]: `${tile.row} / span ${tile.rowSpan}`,
  };
}

function gridImageSizes({ phone, tablet, desktop }: Record<keyof typeof layouts, MosaicTile>) {
  const tileWidth = (tile: MosaicTile, layout: MosaicLayout) =>
    tile.columnSpan * layout.columnWidth + (tile.columnSpan - 1) * layout.gap;
  const viewportWidth = (tile: MosaicTile, columns: number) =>
    `${Math.ceil((tile.columnSpan / columns) * 100)}vw`;
  return `(min-width: 64rem) ${Math.ceil(tileWidth(desktop, layouts.desktop))}px, (min-width: 40rem) ${viewportWidth(tablet, layouts.tablet.columns)}, ${viewportWidth(phone, layouts.phone.columns)}`;
}

function shouldLetBrowserHandle({ event }: { event: MouseEvent }) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  const placed = photos.map((photo) => ({ ratio: photo.width / photo.height }));
  const phoneTiles = placeMosaicTiles({ photos: placed, layout: layouts.phone });
  const tabletTiles = placeMosaicTiles({ photos: placed, layout: layouts.tablet });
  const desktopTiles = placeMosaicTiles({ photos: placed, layout: layouts.desktop });

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
      </div>
      {/* useSearchParams を使う拡大表示だけを Suspense で包み、一覧はサーバーで描いたまま出す */}
      <Suspense fallback={null}>
        <PhotoLightbox photos={photos} />
      </Suspense>
    </>
  );
}

"use client";

import type { CSSProperties, MouseEvent } from "react";
import { Suspense } from "react";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { openPhotoInViewer, PhotoLightbox } from "./photo-lightbox";
import { photoAltText, photoSrcSet } from "./photo-text";

// gallery.css の行の高さ（6.5 / 10 / 13rem）を px にしたもの。行を埋めるために横へ伸びる上限（gallery.css の 1.75 倍）で選ばせる。
const rowHeightsPx = { base: 104, sm: 160, lg: 208 } as const;
const growAllowance = 1.75;

function gridImageSizes({ ratio }: { ratio: number }) {
  const width = (rowHeight: number) => `${Math.round(ratio * rowHeight * growAllowance)}px`;
  return `(min-width: 64rem) ${width(rowHeightsPx.lg)}, (min-width: 40rem) ${width(rowHeightsPx.sm)}, ${width(rowHeightsPx.base)}`;
}

function shouldLetBrowserHandle({ event }: { event: MouseEvent }) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

export function PhotoGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <>
      <ul className="gallery-grid">
        {photos.map((photo) => {
          const ratio = photo.width / photo.height;
          return (
            <li
              key={photo.id}
              className="gallery-item"
              style={{ "--ratio": ratio } as CSSProperties}
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
                  sizes={gridImageSizes({ ratio })}
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

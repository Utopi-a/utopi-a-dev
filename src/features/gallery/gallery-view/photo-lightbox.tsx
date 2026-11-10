"use client";

import { ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { type CSSProperties, type PointerEvent, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { exposureValues, formatCameraName, spokenExposureValues } from "./photo-exif-text";
import { formatTakenDate, largestVariant, photoAltText, photoSrcSet } from "./photo-text";

/**
 * 一覧から開いた履歴かどうかを history.state に残す。
 * 閉じるときに、一覧から開いたなら戻る（履歴を積み増さない）、URL 直開きなら一覧の URL に置き換える。
 * 再読み込みしても history.state は残るので、モジュール内の変数より確か。
 */
const openedHereKey = "galleryViewerOpenedHere";

const swipeThresholdPx = 48;

function photoSearch({ id }: { id: string }) {
  return `?photo=${encodeURIComponent(id)}`;
}

function wasOpenedHere() {
  return window.history.state?.[openedHereKey] === true;
}

export function openPhotoInViewer({ id }: { id: string }) {
  window.history.pushState({ [openedHereKey]: true }, "", photoSearch({ id }));
}

function moveViewerTo({ id }: { id: string }) {
  window.history.replaceState({ [openedHereKey]: wasOpenedHere() }, "", photoSearch({ id }));
}

function leaveViewer() {
  if (wasOpenedHere()) {
    window.history.back();
    return;
  }
  window.history.replaceState(null, "", window.location.pathname);
}

function urlHasPhoto() {
  return new URLSearchParams(window.location.search).has("photo");
}

/** 写真の下に付ける撮影情報の帯。出すものが 1 つも無ければ描かない。 */
function PhotoInfoBand({ photo }: { photo: GalleryPhoto }) {
  const camera = photo.exif ? formatCameraName({ exif: photo.exif }) : null;
  const lens = photo.exif?.lensModel ?? null;
  const values = photo.exif ? exposureValues({ exif: photo.exif }) : [];
  if (!camera && !lens && values.length === 0 && !photo.takenAt) {
    return null;
  }
  return (
    <figcaption className="gallery-viewer-band flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5">
      {camera || lens ? (
        <div className="min-w-0">
          {camera ? <p className="font-semibold">{camera}</p> : null}
          {/* スマホ幅で帯が 4 行を超えないよう 1 行で切る。広い画面では 2 行まで折り返す */}
          {lens ? (
            <p className="truncate text-xs text-muted-foreground sm:line-clamp-2 sm:whitespace-normal">
              {lens}
            </p>
          ) : null}
        </div>
      ) : null}
      {values.length > 0 || photo.takenAt ? (
        <div className="min-w-0 sm:ml-auto sm:text-right">
          {values.length > 0 ? (
            <p className="flex flex-wrap gap-x-3 font-semibold tabular-nums sm:justify-end">
              <span className="sr-only">{spokenExposureValues({ values })}</span>
              {values.map(({ text }) => (
                <span key={text} aria-hidden="true">
                  {text}
                </span>
              ))}
            </p>
          ) : null}
          {photo.takenAt ? (
            <p className="text-xs text-muted-foreground">
              <time dateTime={photo.takenAt}>{formatTakenDate({ takenAt: photo.takenAt })}</time>
            </p>
          ) : null}
        </div>
      ) : null}
    </figcaption>
  );
}

export function PhotoLightbox({ photos }: { photos: GalleryPhoto[] }) {
  const searchParams = useSearchParams();
  const photoId = searchParams.get("photo");
  const index = photoId === null ? -1 : photos.findIndex((photo) => photo.id === photoId);
  const photo = index === -1 ? null : photos[index];
  const previous = index > 0 ? photos[index - 1] : null;
  const next = index !== -1 && index < photos.length - 1 ? photos[index + 1] : null;
  const isOpen = photo !== null;

  const dialogRef = useRef<HTMLDialogElement>(null);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  // URL を唯一の状態にし、dialog の開閉はそれに従わせる。
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (isOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // showModal は背面のスクロールを止めないため、開いている間だけ止める。
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function close() {
    dialogRef.current?.close();
  }

  function handlePointerUp(event: PointerEvent) {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start) {
      return;
    }
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) <= swipeThresholdPx || Math.abs(dx) <= Math.abs(dy)) {
      return;
    }
    const target = dx < 0 ? next : previous;
    if (target) {
      moveViewerTo({ id: target.id });
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label={photo ? photoAltText({ photo }) : "写真"}
      className="m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto overscroll-contain border-0 bg-background p-0 text-foreground backdrop:bg-background"
      // Esc・閉じるボタン・URL の変化のどれで閉じても、ここで URL を一覧に戻す。
      onClose={() => {
        if (urlHasPhoto()) {
          leaveViewer();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" && previous) {
          event.preventDefault();
          moveViewerTo({ id: previous.id });
        } else if (event.key === "ArrowRight" && next) {
          event.preventDefault();
          moveViewerTo({ id: next.id });
        }
      }}
    >
      {photo ? (
        <div className="flex min-h-full flex-col">
          <div className="flex shrink-0 items-center justify-between p-1 sm:p-2">
            <p className="px-3 text-sm text-muted-foreground tabular-nums">
              {index + 1} / {photos.length}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 [&_svg:not([class*='size-'])]:size-5"
              aria-label="閉じる"
              onClick={close}
            >
              <XIcon />
            </Button>
          </div>
          <div
            className="flex flex-1 touch-pan-y touch-pinch-zoom flex-col items-center justify-center pb-4 sm:px-16 sm:pb-6"
            onPointerDown={(event) => {
              swipeStartRef.current = { x: event.clientX, y: event.clientY };
            }}
            onPointerUp={handlePointerUp}
            onPointerCancel={() => {
              swipeStartRef.current = null;
            }}
          >
            <div
              className="gallery-viewer-frame"
              style={
                {
                  "--ratio": photo.width / photo.height,
                  "--photo-width": photo.width,
                } as CSSProperties
              }
            >
              <figure className="gallery-viewer-print">
                {/* 前の写真を残したまま次を読み込まないよう、写真ごとに作り直す */}
                <img
                  key={photo.id}
                  className="gallery-viewer-photo select-none"
                  src={largestVariant({ photo })?.url}
                  srcSet={photoSrcSet({ photo })}
                  sizes="100vw"
                  width={photo.width}
                  height={photo.height}
                  alt={photoAltText({ photo })}
                  decoding="async"
                  draggable={false}
                />
                <PhotoInfoBand photo={photo} />
              </figure>
              {photo.caption ? (
                <p className="gallery-viewer-caption mt-3 px-4 text-sm leading-relaxed sm:px-0">
                  {photo.caption}
                </p>
              ) : null}
            </div>
            {/* 縦にスクロールしても押せるよう、画面に対して固定する */}
            {previous ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="fixed top-1/2 left-1 size-11 -translate-y-1/2 bg-background/70 sm:left-2 [&_svg:not([class*='size-'])]:size-6"
                aria-label="前の写真"
                onClick={() => moveViewerTo({ id: previous.id })}
              >
                <ChevronLeftIcon />
              </Button>
            ) : null}
            {next ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="fixed top-1/2 right-1 size-11 -translate-y-1/2 bg-background/70 sm:right-2 [&_svg:not([class*='size-'])]:size-6"
                aria-label="次の写真"
                onClick={() => moveViewerTo({ id: next.id })}
              >
                <ChevronRightIcon />
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}

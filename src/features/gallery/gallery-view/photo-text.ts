import type { GalleryPhoto } from "@/features/gallery/photo";

// サーバーとブラウザで同じ日付になるよう、表示のタイムゾーンを固定する。
const takenDateFormat = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function formatTakenDate({ takenAt }: { takenAt: string }): string {
  return takenDateFormat.format(new Date(takenAt));
}

export function photoAltText({ photo }: { photo: Pick<GalleryPhoto, "caption" | "takenAt"> }) {
  if (photo.caption) {
    return photo.caption;
  }
  if (photo.takenAt) {
    return `${formatTakenDate({ takenAt: photo.takenAt })}の写真`;
  }
  return "写真";
}

export function photoSrcSet({ photo }: { photo: Pick<GalleryPhoto, "variants"> }) {
  return photo.variants.map((variant) => `${variant.url} ${variant.width}w`).join(", ");
}

export function largestVariant({ photo }: { photo: Pick<GalleryPhoto, "variants"> }) {
  return photo.variants[photo.variants.length - 1];
}

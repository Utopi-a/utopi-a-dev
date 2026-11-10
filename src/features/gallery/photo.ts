import type { GalleryPhotoExif } from "@/db/schema/gallery";

export type { GalleryPhotoExif };

/** 画面に渡す写真 1 サイズ分。URL は保存先の公開 URL で組み立て済み。 */
export type GalleryPhotoVariant = {
  url: string;
  width: number;
  height: number;
};

/**
 * 画面とキャッシュに渡す写真。
 * キャッシュが JSON で保存するため、日時は Date ではなく ISO 8601 の文字列で持つ。
 */
export type GalleryPhoto = {
  id: string;
  caption: string | null;
  takenAt: string | null;
  /** 撮影情報。読み取れなかった写真は null。 */
  exif: GalleryPhotoExif | null;
  /** 最大サイズの寸法。縦横比の計算に使う。 */
  width: number;
  height: number;
  /** 幅の昇順。最後が最大サイズ。 */
  variants: GalleryPhotoVariant[];
};

/** 写真のファイルを置く場所。本番は R2、開発とテストは手元のディレクトリ。 */
export type GalleryStorage = {
  put(options: { key: string; body: Uint8Array; contentType: string }): Promise<void>;
  remove(options: { keys: string[] }): Promise<void>;
  publicUrl(options: { key: string }): string;
};

export function buildPhotoVariantKey({ photoId, width }: { photoId: string; width: number }) {
  return `photos/${photoId}/${width}.webp`;
}

import type { galleryPhoto } from "@/db/schema/gallery";
import type { GalleryPhoto } from "@/features/gallery/photo";
import type { GalleryStorage } from "@/features/gallery/storage/gallery-storage";

type GalleryPhotoRow = Pick<
  typeof galleryPhoto.$inferSelect,
  "id" | "caption" | "takenAt" | "exif" | "width" | "height" | "variants"
>;

export function toGalleryPhoto({
  row,
  storage,
}: {
  row: GalleryPhotoRow;
  storage: GalleryStorage;
}): GalleryPhoto {
  return {
    id: row.id,
    caption: row.caption,
    takenAt: row.takenAt?.toISOString() ?? null,
    exif: row.exif,
    width: row.width,
    height: row.height,
    variants: [...row.variants]
      .sort((a, b) => a.width - b.width)
      .map(({ key, width, height }) => ({ url: storage.publicUrl({ key }), width, height })),
  };
}

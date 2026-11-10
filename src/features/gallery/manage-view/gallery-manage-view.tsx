import type { GalleryPhoto } from "@/features/gallery/photo";
import { ManagedPhotoRow } from "./managed-photo-row";
import { PhotoUploader } from "./photo-uploader";

export function GalleryManageView({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="space-y-10">
      <PhotoUploader />
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">まだ写真がありません。</p>
      ) : (
        <ul className="border-t border-border">
          {photos.map((photo) => (
            <ManagedPhotoRow key={photo.id} photo={photo} />
          ))}
        </ul>
      )}
    </div>
  );
}

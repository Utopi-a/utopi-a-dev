import type { GalleryPhoto } from "@/features/gallery/photo";
import { PageHeader } from "@/features/portfolio/page-header/page-header";
import { PhotoGrid } from "./photo-grid";
import "./gallery.css";

export function GalleryView({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 pt-12 pb-20 sm:px-6 sm:pt-20 sm:pb-28">
      <div className="space-y-10 sm:space-y-12">
        <PageHeader title="写真" />
        {photos.length === 0 ? (
          <p className="text-muted-foreground">まだ写真がありません。</p>
        ) : (
          <PhotoGrid photos={photos} />
        )}
      </div>
    </div>
  );
}

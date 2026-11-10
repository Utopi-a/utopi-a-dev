import type { GalleryPhoto } from "@/features/gallery/photo";
import { PortfolioPage } from "@/features/portfolio/portfolio-page/portfolio-page";
import { PhotoGrid } from "./photo-grid";
import "./gallery.css";

export function GalleryView({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <PortfolioPage>
      <header className="pf-page-head gallery-head">
        <h1 className="site-title">写真</h1>
      </header>
      {photos.length === 0 ? (
        <p className="text-muted-foreground">まだ写真がありません。</p>
      ) : (
        <PhotoGrid photos={photos} />
      )}
    </PortfolioPage>
  );
}

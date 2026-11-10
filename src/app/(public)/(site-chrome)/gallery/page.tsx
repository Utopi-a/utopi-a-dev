import type { Metadata } from "next";
import { GalleryView } from "@/features/gallery/gallery-view/gallery-view";
import { listGalleryPhotos } from "@/features/gallery/list-photos/list-photos";

export const metadata: Metadata = {
  title: "写真",
};

export default async function GalleryPage() {
  const photos = await listGalleryPhotos();
  return <GalleryView photos={photos} />;
}

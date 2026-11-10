import Link from "next/link";
import { redirect } from "next/navigation";
import { queryGalleryPhotos } from "@/features/gallery/list-photos/list-photos";
import { GalleryManageView } from "@/features/gallery/manage-view/gallery-manage-view";
import { resolveGalleryOwner } from "@/features/gallery/owner/resolve-gallery-owner";

export default async function LabGalleryManagePage() {
  const owner = await resolveGalleryOwner();

  if (!owner.ok && owner.code === "unauthenticated") {
    redirect("/login?next=/lab/gallery/manage");
  }

  const heading = <h1 className="text-2xl font-semibold tracking-tight">ギャラリー管理</h1>;

  if (!owner.ok) {
    return (
      <div className="space-y-4">
        {heading}
        <p className="text-sm text-muted-foreground">このアカウントでは写真を投稿できません。</p>
      </div>
    );
  }

  const photos = await queryGalleryPhotos();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        {heading}
        <Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground">
          公開ページを見る
        </Link>
      </div>
      <GalleryManageView photos={photos} />
    </div>
  );
}

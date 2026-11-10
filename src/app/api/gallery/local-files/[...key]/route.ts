import { serveLocalGalleryFile } from "@/features/gallery/storage/serve-local-file";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  return serveLocalGalleryFile({ key: key.join("/") });
}

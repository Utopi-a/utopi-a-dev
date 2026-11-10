import { uploadPhoto } from "@/features/gallery/upload-photo/upload-photo";

// sharp と node:fs を使うので Node.js の実行環境で動かす
export const runtime = "nodejs";

export async function POST(request: Request) {
  return uploadPhoto({ request });
}

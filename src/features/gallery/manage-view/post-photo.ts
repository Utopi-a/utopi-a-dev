import type { GalleryPhotoExif } from "@/features/gallery/photo";

export type PostPhotoResult = { ok: true } | { ok: false; error: string; unauthenticated: boolean };

function jpegFileName({ name }: { name: string }) {
  const base = name.replace(/\.[^.]+$/, "") || "photo";
  return `${base}.jpg`;
}

async function readErrorMessage({ response }: { response: Response }) {
  try {
    const body: unknown = await response.json();
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      return body.error;
    }
  } catch {
    // 本文が JSON でなければ状態コードで伝える。
  }
  return `送信に失敗しました（${response.status}）`;
}

export async function postPhoto({
  blob,
  originalName,
  takenAt,
  exif,
}: {
  blob: Blob;
  originalName: string;
  takenAt: string | null;
  exif: GalleryPhotoExif | null;
}): Promise<PostPhotoResult> {
  const formData = new FormData();
  formData.append("file", blob, jpegFileName({ name: originalName }));
  if (takenAt) {
    formData.append("takenAt", takenAt);
  }
  if (exif) {
    formData.append("exif", JSON.stringify(exif));
  }

  let response: Response;
  try {
    response = await fetch("/api/gallery/photos", { method: "POST", body: formData });
  } catch {
    return { ok: false, error: "通信できませんでした", unauthenticated: false };
  }

  if (response.ok) {
    return { ok: true };
  }
  return {
    ok: false,
    error: await readErrorMessage({ response }),
    unauthenticated: response.status === 401,
  };
}

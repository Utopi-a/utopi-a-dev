"use client";

import { ImagePlusIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { postPhoto } from "./post-photo";
import { looksLikeHeic, preparePhotoFile } from "./prepare-photo-file/prepare-photo-file";

type UploadStatus = "queued" | "preparing" | "uploading" | "done" | "failed";

type UploadItem = {
  key: string;
  file: File;
  previewUrl: string;
  status: UploadStatus;
  error: string | null;
  unauthenticated: boolean;
};

// 縮小で大きな canvas を同時に持ちすぎないよう、下ごしらえから送信までを 2 枚ずつに絞る。
const maxParallelUploads = 2;

const statusLabels: Record<Exclude<UploadStatus, "failed">, string> = {
  queued: "待機中",
  preparing: "準備中",
  uploading: "送信中",
  done: "完了",
};

function isImageFile({ file }: { file: File }) {
  return file.type.startsWith("image/") || looksLikeHeic({ type: file.type, name: file.name });
}

function hasDraggedFiles({ event }: { event: DragEvent }) {
  return Array.from(event.dataTransfer.types).includes("Files");
}

function progressText({ items }: { items: UploadItem[] }) {
  const done = items.filter((item) => item.status === "done").length;
  const failed = items.filter((item) => item.status === "failed").length;
  const failedText = failed > 0 ? `、${failed} 枚失敗` : "";
  return `${items.length} 枚中 ${done} 枚完了${failedText}`;
}

export function PhotoUploader() {
  const router = useRouter();
  const [, startRefresh] = useTransition();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedKeysRef = useRef(new Set<string>());
  const nextKeyRef = useRef(0);
  const dragDepthRef = useRef(0);
  const previewUrlsRef = useRef<string[]>([]);

  const updateItem = useCallback(({ key, patch }: { key: string; patch: Partial<UploadItem> }) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  const send = useCallback(
    async ({ item }: { item: UploadItem }) => {
      updateItem({ key: item.key, patch: { status: "preparing", error: null } });
      const prepared = await preparePhotoFile({ file: item.file });
      if (!prepared.ok) {
        updateItem({ key: item.key, patch: { status: "failed", error: prepared.error } });
        return;
      }

      updateItem({ key: item.key, patch: { status: "uploading" } });
      const result = await postPhoto({
        blob: prepared.blob,
        originalName: item.file.name,
        takenAt: prepared.takenAt,
        exif: prepared.exif,
      });
      if (!result.ok) {
        updateItem({
          key: item.key,
          patch: {
            status: "failed",
            error: result.error,
            unauthenticated: result.unauthenticated,
          },
        });
        return;
      }

      updateItem({ key: item.key, patch: { status: "done" } });
      startRefresh(() => router.refresh());
    },
    [router, updateItem],
  );

  useEffect(() => {
    const started = startedKeysRef.current;
    const running = items.filter(
      (item) =>
        started.has(item.key) &&
        (item.status === "queued" || item.status === "preparing" || item.status === "uploading"),
    ).length;
    const waiting = items.filter((item) => item.status === "queued" && !started.has(item.key));
    for (const item of waiting.slice(0, Math.max(0, maxParallelUploads - running))) {
      started.add(item.key);
      void send({ item });
    }
  }, [items, send]);

  useEffect(() => {
    const previewUrls = previewUrlsRef.current;
    return () => {
      for (const url of previewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  function addFiles({ files }: { files: File[] }) {
    const images = files.filter((file) => isImageFile({ file }));
    if (images.length === 0) {
      return;
    }
    const added = images.map((file): UploadItem => {
      nextKeyRef.current += 1;
      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.push(previewUrl);
      return {
        key: `upload-${nextKeyRef.current}`,
        file,
        previewUrl,
        status: "queued",
        error: null,
        unauthenticated: false,
      };
    });
    setItems((current) => [...current, ...added]);
  }

  function retry({ key }: { key: string }) {
    startedKeysRef.current.delete(key);
    updateItem({ key, patch: { status: "queued", error: null, unauthenticated: false } });
  }

  return (
    <section className="space-y-4">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: ドロップは PC 向けの近道で、同じ操作を「写真を選ぶ」ボタンでもできる */}
      <div
        className={cn(
          "flex flex-col items-start gap-3 border-border pointer-fine:items-center pointer-fine:border pointer-fine:border-dashed pointer-fine:px-6 pointer-fine:py-10",
          isDragging && "pointer-fine:border-ring",
        )}
        onDragEnter={(event) => {
          if (!hasDraggedFiles({ event })) {
            return;
          }
          event.preventDefault();
          dragDepthRef.current += 1;
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          if (hasDraggedFiles({ event })) {
            event.preventDefault();
          }
        }}
        onDragLeave={() => {
          dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
          if (dragDepthRef.current === 0) {
            setIsDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragDepthRef.current = 0;
          setIsDragging(false);
          addFiles({ files: Array.from(event.dataTransfer.files) });
        }}
      >
        {/*
          accept に .heic を足さない。iPhone の Safari は image/* のときだけ、写真アプリから選んだ HEIC を
          JPEG に直して渡してくれるため。
        */}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          aria-label="写真を選ぶ"
          onChange={(event) => {
            addFiles({ files: Array.from(event.target.files ?? []) });
            // 同じ写真を選び直しても change が起きるよう、選択を空に戻す。
            event.target.value = "";
          }}
        />
        <Button type="button" className="h-11 px-4" onClick={() => inputRef.current?.click()}>
          <ImagePlusIcon />
          写真を選ぶ
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="space-y-2">
          <p aria-live="polite" className="text-sm text-muted-foreground tabular-nums">
            {progressText({ items })}
          </p>
          <ul className="divide-y divide-border border-y border-border">
            {items.map((item) => (
              <li key={item.key} className="flex items-center gap-3 py-2">
                {/* プレビューを出せない形式（PC の HEIC など）でも、行の高さが変わらないよう地を敷く */}
                <img
                  src={item.previewUrl}
                  alt=""
                  className="size-12 shrink-0 bg-muted object-cover"
                  width={48}
                  height={48}
                />
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="truncate text-sm">{item.file.name}</p>
                  {item.status === "failed" ? (
                    <p className="text-sm text-destructive">
                      失敗: {item.error}
                      {item.unauthenticated ? (
                        <>
                          {" "}
                          <Link href="/login?next=/lab/gallery/manage" className="underline">
                            ログインし直してください
                          </Link>
                        </>
                      ) : null}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">{statusLabels[item.status]}</p>
                  )}
                </div>
                {item.status === "failed" ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 shrink-0"
                    onClick={() => retry({ key: item.key })}
                  >
                    再試行
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

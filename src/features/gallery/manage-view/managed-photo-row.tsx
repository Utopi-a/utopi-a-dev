"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deletePhotoAction } from "@/features/gallery/delete-photo/delete-photo-action";
import { photoExifSummary } from "@/features/gallery/gallery-view/photo-exif-text";
import { photoAltText } from "@/features/gallery/gallery-view/photo-text";
import type { GalleryPhoto } from "@/features/gallery/photo";
import { updatePhotoAction } from "@/features/gallery/update-photo/update-photo-action";
import { replaceTakenAtDate, takenAtToDateInputValue } from "./taken-at-date";

const maxCaptionLength = 500;

type RowMessage = { kind: "saved" } | { kind: "error"; text: string };

function normalizeCaption({ value }: { value: string }) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function ManagedPhotoRow({ photo }: { photo: GalleryPhoto }) {
  const router = useRouter();
  const [caption, setCaption] = useState(photo.caption ?? "");
  const savedDate = takenAtToDateInputValue({ takenAt: photo.takenAt });
  const [date, setDate] = useState(savedDate);
  const [message, setMessage] = useState<RowMessage | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const isDirty = normalizeCaption({ value: caption }) !== photo.caption || date !== savedDate;
  const thumbnail = photo.variants[0];
  const exifSummary = photo.exif ? photoExifSummary({ exif: photo.exif }) : null;

  function save() {
    setMessage(null);
    startSaving(async () => {
      const result = await updatePhotoAction({
        id: photo.id,
        caption: normalizeCaption({ value: caption }),
        takenAt:
          date === savedDate ? photo.takenAt : replaceTakenAtDate({ takenAt: photo.takenAt, date }),
      });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      setMessage({ kind: "saved" });
      router.refresh();
    });
  }

  function remove() {
    setIsConfirmOpen(false);
    setMessage(null);
    startDeleting(async () => {
      const result = await deletePhotoAction({ id: photo.id });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.error });
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="flex items-start gap-3 border-b border-border py-4 sm:items-center">
      {thumbnail ? (
        <img
          src={thumbnail.url}
          alt={photoAltText({ photo })}
          width={thumbnail.width}
          height={thumbnail.height}
          loading="lazy"
          decoding="async"
          // 縦横比がまちまちでも入力欄の左端が揃うよう、正方形に切り抜く
          className="size-20 shrink-0 bg-muted object-cover"
        />
      ) : null}
      {/* スマホ幅では写真の右に入力欄とボタンを縦に積み、1 枚あたりの高さを抑える */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-start">
        {/* 公開される撮影情報を持ち主が確かめられるよう、キャプション欄の下に出す */}
        <div className="min-w-0 space-y-1 sm:flex-1">
          <Input
            aria-label="キャプション"
            value={caption}
            maxLength={maxCaptionLength}
            onChange={(event) => setCaption(event.target.value)}
          />
          {exifSummary ? (
            <p className="truncate text-sm text-muted-foreground">{exifSummary}</p>
          ) : null}
        </div>
        <Input
          type="date"
          aria-label="撮影日"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="sm:w-40"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 sm:h-9"
            disabled={!isDirty || isSaving || isDeleting}
            onClick={save}
          >
            保存
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-11 text-destructive hover:text-destructive sm:h-9"
            disabled={isSaving || isDeleting}
            onClick={() => setIsConfirmOpen(true)}
          >
            削除
          </Button>
          {message?.kind === "saved" && !isDirty ? (
            <span role="status" className="text-sm text-muted-foreground">
              保存しました
            </span>
          ) : null}
          {message?.kind === "error" ? (
            <span role="alert" className="text-sm text-destructive">
              {message.text}
            </span>
          ) : null}
        </div>
      </div>
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>この写真を削除しますか？</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setIsConfirmOpen(false)}>
              やめる
            </Button>
            <Button type="button" variant="destructive" onClick={remove}>
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}

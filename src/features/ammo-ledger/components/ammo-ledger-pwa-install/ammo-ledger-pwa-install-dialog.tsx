"use client";

import { MoreVerticalIcon, ShareIcon, SmartphoneIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ammoLedgerPwaConfig } from "@/features/ammo-ledger/pwa/ammo-ledger-pwa-config";
import type { PwaInstallPlatform } from "@/features/ammo-ledger/pwa/detect-pwa-install-platform/detect-pwa-install-platform";

type AmmoLedgerPwaInstallDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PwaInstallPlatform;
  canNativeInstall: boolean;
  onNativeInstall: () => Promise<boolean>;
};

function InstallStep({
  step,
  icon,
  children,
}: {
  step: number;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
        {step}
      </span>
      <div className="min-w-0 space-y-1 pt-0.5">
        <div className="flex items-center gap-2 text-sm font-medium">
          {icon}
          <span>{children}</span>
        </div>
      </div>
    </li>
  );
}

function IosInstallSteps() {
  return (
    <ol className="space-y-4">
      <InstallStep step={1} icon={<ShareIcon className="size-4 text-primary" aria-hidden />}>
        Safari 画面下の「共有」をタップ
      </InstallStep>
      <InstallStep step={2} icon={<SmartphoneIcon className="size-4 text-primary" aria-hidden />}>
        「ホーム画面に追加」を選ぶ
      </InstallStep>
      <InstallStep step={3} icon={<SmartphoneIcon className="size-4 text-primary" aria-hidden />}>
        名前を確認して「追加」をタップ
      </InstallStep>
    </ol>
  );
}

function AndroidInstallSteps() {
  return (
    <ol className="space-y-4">
      <InstallStep step={1} icon={<MoreVerticalIcon className="size-4 text-primary" aria-hidden />}>
        Chrome のメニュー（⋮）を開く
      </InstallStep>
      <InstallStep step={2} icon={<SmartphoneIcon className="size-4 text-primary" aria-hidden />}>
        「アプリをインストール」または「ホーム画面に追加」を選ぶ
      </InstallStep>
    </ol>
  );
}

export function AmmoLedgerPwaInstallDialog({
  open,
  onOpenChange,
  platform,
  canNativeInstall,
  onNativeInstall,
}: AmmoLedgerPwaInstallDialogProps) {
  const [isInstalling, setIsInstalling] = useState(false);

  const handleNativeInstall = async () => {
    setIsInstalling(true);

    try {
      const accepted = await onNativeInstall();
      if (accepted) {
        onOpenChange(false);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>ホーム画面に追加</DialogTitle>
          <DialogDescription>
            {ammoLedgerPwaConfig.shortName}
            をアプリのように使えます。ブラウザの UI
            なしで素早く開け、オフラインでも一部画面を表示できます。
          </DialogDescription>
        </DialogHeader>

        {platform === "ios" ? <IosInstallSteps /> : <AndroidInstallSteps />}

        {platform === "ios" ? (
          <p className="text-xs text-muted-foreground">
            iPhone では Safari から追加してください。Chrome ではホーム画面への追加ができません。
          </p>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-start">
          {canNativeInstall ? (
            <Button onClick={handleNativeInstall} disabled={isInstalling}>
              {isInstalling ? "インストール中..." : "インストール"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            閉じる
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

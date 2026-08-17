type AmmoTypeSnapshot = {
  ammoCartridgeType: string | null;
  ammoCaliber: string | null;
  ammoGaugeNumber: string | null;
  ammoTypeName: string;
};

/**
 * 法定表記に基づく実包種類ラベルを構成する。
 * 2025-03-01以降、ライフル以外は番径＋単弾/散弾の別が必須。
 *
 * - rifle: ammoTypeName（なければ ammoCaliber）
 * - shotgun_slug: `${ammoCaliber}・単弾`
 * - shotgun_shot: `${ammoCaliber}・散弾`
 * - snapshot不足時: ammoTypeName fallback
 */
export function formatAmmoTypeLabel({ snapshot }: { snapshot: AmmoTypeSnapshot }): string {
  const { ammoCartridgeType, ammoCaliber, ammoTypeName } = snapshot;

  switch (ammoCartridgeType) {
    case "rifle":
      return ammoTypeName || ammoCaliber || "";

    case "shotgun_slug": {
      if (!ammoCaliber) return ammoTypeName;
      return `${ammoCaliber}・単弾`;
    }

    case "shotgun_shot": {
      if (!ammoCaliber) return ammoTypeName;
      return `${ammoCaliber}・散弾`;
    }

    case null:
    case undefined:
      return ammoTypeName;

    default: {
      const _exhaustive: never = ammoCartridgeType as never;
      void _exhaustive;
      return ammoTypeName;
    }
  }
}

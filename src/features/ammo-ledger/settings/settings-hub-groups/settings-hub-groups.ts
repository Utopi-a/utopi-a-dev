// e2e はリンク名の一部（年初繰越・譲受許可申請書・帳簿の確定・ロック）で探すため、
// その語は該当する項目だけに含める。
export const settingsHubGroups = [
  {
    title: "はじめに登録",
    items: [
      {
        href: "/lab/ammo-ledger/settings/profile",
        label: "帳簿プロフィール",
        description: "氏名・住所。帳簿の印刷に使います",
      },
      {
        href: "/lab/ammo-ledger/settings/guns",
        label: "銃",
        description: "消費の記録に必要です。名称・許可番号・銃種",
      },
      {
        href: "/lab/ammo-ledger/settings/ammo-types",
        label: "弾種",
        description: "消費・譲り受けの記録に必要です。番径・散弾/単弾・1箱の発数",
      },
      {
        href: "/lab/ammo-ledger/settings/permits",
        label: "譲受許可",
        description: "譲り受け（購入）の記録に必要です。付与日・数量・有効期限",
      },
      {
        href: "/lab/ammo-ledger/settings/opening-balance",
        label: "年初繰越",
        description: "1月1日時点の残弾数・許可残数（前年からの繰越・紙の帳簿からの移行）",
      },
    ],
  },
  {
    title: "よく使う場所・相手",
    items: [
      {
        href: "/lab/ammo-ledger/settings/ranges",
        label: "射撃場（マイリスト）",
        description: "消費の記録でよく選ぶ射撃場の登録・編集",
      },
      {
        href: "/lab/ammo-ledger/settings/counterparties",
        label: "購入先・譲渡先（マイリスト）",
        description: "譲り受け・譲渡の記録でよく選ぶ相手の登録・編集",
      },
      {
        href: "/lab/ammo-ledger/settings/ranges/catalog",
        label: "全国の射撃場一覧",
        description: "196件・県別表示・検索・お気に入り",
      },
      {
        href: "/lab/ammo-ledger/settings/counterparties/catalog",
        label: "全国の銃砲店・射撃場一覧",
        description: "購入先として使える銃砲店・射撃場",
      },
    ],
  },
  {
    title: "書類・年末の手続き",
    items: [
      {
        href: "/lab/ammo-ledger/applications/acquisition-permit/new",
        label: "譲受許可申請書",
        description: "別記様式第2号を入力して印刷",
      },
      {
        href: "/lab/ammo-ledger/settings/ledger-lock",
        label: "帳簿の確定・ロック",
        description: "提出する期間を確定し、変更できないようにします",
      },
    ],
  },
  {
    title: "データの点検",
    items: [
      {
        href: "/lab/ammo-ledger/settings/ammo-types/review",
        label: "弾種分類の確認",
        description: "分類が未確認の弾種や、弾種とのつながりが切れた記録を直します",
      },
    ],
  },
] as const;

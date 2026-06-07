export const settingsHubGroups = [
  {
    title: "帳簿",
    items: [
      {
        href: "/lab/ammo-ledger/settings/profile",
        label: "帳簿プロフィール",
        description: "氏名・住所（印刷にも使用）",
      },
      {
        href: "/lab/ammo-ledger/applications/acquisition-permit/new",
        label: "譲受許可申請書",
        description: "別記様式第2号を入力して印刷",
      },
      {
        href: "/lab/ammo-ledger/settings/permits",
        label: "譲受許可",
        description: "付与日・名称・数量・目的・有効期限",
      },
      {
        href: "/lab/ammo-ledger/settings/opening-balance",
        label: "年初繰越",
        description: "紙の帳簿から移行するときの残弾数・許可残数",
      },
    ],
  },
  {
    title: "入力補助マスタ",
    items: [
      {
        href: "/lab/ammo-ledger/settings/ammo-types",
        label: "弾種",
        description: "番径・散弾/単弾・1箱あたり発数",
      },
      {
        href: "/lab/ammo-ledger/settings/guns",
        label: "銃",
        description: "名称・許可番号・銃種",
      },
      {
        href: "/lab/ammo-ledger/settings/ranges",
        label: "射撃場（マイリスト）",
        description: "よく使う射撃場の登録・編集",
      },
      {
        href: "/lab/ammo-ledger/settings/counterparties",
        label: "購入先・譲渡先（マイリスト）",
        description: "よく使う購入先・譲渡先の登録・編集",
      },
    ],
  },
  {
    title: "全国データ",
    items: [
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
] as const;

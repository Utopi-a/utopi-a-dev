import { describe, expect, it } from "vitest";
import type { AmmoLedgerWorkspace } from "@/features/ammo-ledger/workspace/ammo-ledger-workspace-types";
import {
  buildTestEntry,
  buildTestWorkspace,
  testAmmoType,
} from "@/features/ammo-ledger/workspace/build-test-workspace/build-test-workspace";
import { buildHomeStatus } from "./build-home-status";

const createdAt = new Date("2026-01-01T00:00:00Z");

function buildPermit({
  id,
  grantedOn,
  expiresOn,
  quantity = 500,
  ledgerPurpose = "shooting",
}: {
  id: string;
  grantedOn: string;
  expiresOn: string;
  quantity?: number;
  ledgerPurpose?: string;
}) {
  return {
    id,
    userId: "user-1",
    ledgerPurpose,
    name: "12番",
    permitPurpose: "標的射撃",
    grantedOn,
    expiresOn,
    quantity,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  };
}

// 許可の登録時に作られる付与・失効イベント
function buildPermitEvents({ permit }: { permit: ReturnType<typeof buildPermit> }) {
  return [
    { kind: "grant", occurredOn: permit.grantedOn, quantity: permit.quantity },
    { kind: "expiry", occurredOn: permit.expiresOn, quantity: 0 },
  ].map(({ kind, occurredOn, quantity }) => ({
    id: `${permit.id}-${kind}`,
    userId: "user-1",
    permitId: permit.id,
    purpose: permit.ledgerPurpose,
    eventKind: kind,
    occurredOn,
    quantity,
    memo: null,
    createdAt,
    updatedAt: createdAt,
  }));
}

function buildPermitWorkspace({
  permits,
  entries = [],
  ...overrides
}: {
  permits: ReturnType<typeof buildPermit>[];
  entries?: ReturnType<typeof buildTestEntry>[];
} & Omit<Partial<AmmoLedgerWorkspace>, "permits" | "entries">) {
  return buildTestWorkspace({
    permits,
    permitEvents: permits.flatMap((permit) => buildPermitEvents({ permit })),
    entries,
    ...overrides,
  });
}

function acquire({
  id,
  occurredOn,
  quantity,
}: {
  id: string;
  occurredOn: string;
  quantity: number;
}) {
  return buildTestEntry({ id, category: "acquire", occurredOn, quantity });
}

describe("buildHomeStatus の状況サマリ", () => {
  it("帳簿残数は全用途の合計で、帳簿・残弾画面と同じ値になる", () => {
    const workspace = buildTestWorkspace({
      entries: [
        buildTestEntry({
          id: "c1",
          category: "carryover",
          occurredOn: "2026-01-01",
          quantity: 100,
        }),
        buildTestEntry({
          id: "c2",
          category: "carryover",
          occurredOn: "2026-01-01",
          quantity: 50,
          purpose: "hunting",
        }),
        buildTestEntry({ id: "u1", category: "consume", occurredOn: "2026-05-01", quantity: 10 }),
      ],
    });

    const status = buildHomeStatus({ workspace, today: "2026-10-13" });

    expect(status.totalStock).toBe(140);
    expect(workspace.inventoryItems.reduce((sum, item) => sum + item.bookStock, 0)).toBe(140);
  });

  it("許可のある用途ごとに今日使える残りと最も近い有効期限を返す", () => {
    const status = buildHomeStatus({
      workspace: buildPermitWorkspace({
        permits: [
          buildPermit({ id: "p1", grantedOn: "2026-02-01", expiresOn: "2027-01-31" }),
          buildPermit({
            id: "p2",
            grantedOn: "2026-06-01",
            expiresOn: "2026-12-20",
            quantity: 200,
          }),
          // 失効済みで残りもない用途は出さない
          buildPermit({
            id: "p3",
            grantedOn: "2025-01-01",
            expiresOn: "2025-12-31",
            ledgerPurpose: "hunting",
          }),
        ],
        entries: [acquire({ id: "a1", occurredOn: "2026-07-01", quantity: 50 })],
      }),
      today: "2026-10-13",
    });

    expect(status.permitSummaries).toEqual([
      { purpose: "shooting", balance: 650, nearestExpiresOn: "2026-12-20" },
    ]);
  });

  it("確定済みの日付をそのまま返し、未確定なら null を返す", () => {
    const locked = buildHomeStatus({
      workspace: buildTestWorkspace({
        lockState: { isLocked: true, lockedThrough: "2025-12-31" },
      }),
      today: "2026-10-13",
    });
    const unlocked = buildHomeStatus({ workspace: buildTestWorkspace(), today: "2026-10-13" });

    expect(locked.lockedThrough).toBe("2025-12-31");
    expect(unlocked.lockedThrough).toBeNull();
  });
});

describe("buildHomeStatus の注意事項", () => {
  const today = "2026-10-13";

  it("有効期限まで30日以内で残りのある許可を知らせ、31日以上先や使い切った許可は知らせない", () => {
    const status = buildHomeStatus({
      workspace: buildPermitWorkspace({
        permits: [
          buildPermit({ id: "soon", grantedOn: "2026-01-01", expiresOn: "2026-11-12" }),
          buildPermit({ id: "later", grantedOn: "2026-01-01", expiresOn: "2026-11-13" }),
          buildPermit({
            id: "used",
            grantedOn: "2026-01-01",
            expiresOn: "2026-10-20",
            quantity: 100,
            ledgerPurpose: "hunting",
          }),
        ],
        entries: [
          acquire({ id: "a1", occurredOn: "2026-03-01", quantity: 120 }),
          { ...acquire({ id: "a2", occurredOn: "2026-03-01", quantity: 100 }), purpose: "hunting" },
        ],
      }),
      today,
    });

    expect(status.notices).toEqual([
      {
        id: "permit-expiring-soon",
        tone: "warning",
        message: "射撃用の譲受許可（12番）は有効期限まであと30日です。残り380個。",
        href: "/lab/ammo-ledger/ledger?purpose=shooting",
      },
    ]);
  });

  it("期限が切れて30日以内の許可は、期限当日時点で残りがあれば知らせる", () => {
    const status = buildHomeStatus({
      workspace: buildPermitWorkspace({
        permits: [
          buildPermit({ id: "left", grantedOn: "2025-10-01", expiresOn: "2026-10-03" }),
          buildPermit({ id: "old", grantedOn: "2025-09-01", expiresOn: "2026-09-12" }),
          buildPermit({
            id: "used",
            grantedOn: "2025-10-01",
            expiresOn: "2026-10-10",
            quantity: 100,
            ledgerPurpose: "hunting",
          }),
        ],
        entries: [
          acquire({ id: "a1", occurredOn: "2026-10-03", quantity: 200 }),
          {
            ...acquire({ id: "a2", occurredOn: "2026-10-10", quantity: 100 }),
            purpose: "hunting",
          },
        ],
      }),
      today,
    });

    expect(status.notices.map((notice) => notice.message)).toEqual([
      "射撃用の譲受許可（12番）は2026/10/03で有効期限が切れました。使わなかった残り300個。",
    ]);
  });

  it("分類が未確認の弾種があれば件数と確認ページを示す", () => {
    const unconfirmed = { ...testAmmoType, id: "ammo-2", classificationConfirmedAt: null };
    const status = buildHomeStatus({
      workspace: buildTestWorkspace({
        inventoryItems: [
          { ammoType: testAmmoType, bookStock: 0 },
          { ammoType: unconfirmed, bookStock: 0 },
        ],
      }),
      today,
    });

    expect(status.notices).toEqual([
      {
        id: "unconfirmed-ammo-types",
        tone: "info",
        message: "分類が未確認の弾種が1件あります。",
        href: "/lab/ammo-ledger/settings/ammo-types/review",
      },
    ]);
  });

  it.each([
    ["1〜3月で前年の記録があり未確定", "2027-03-31", null, true],
    ["前年の途中までしか確定していない", "2027-01-05", "2026-06-30", true],
    ["前年末まで確定済み", "2027-01-05", "2026-12-31", false],
    ["4月以降", "2027-04-01", null, false],
  ])("前年の帳簿の確定: %s", (_, todayInYear, lockedThrough, shows) => {
    const status = buildHomeStatus({
      workspace: buildTestWorkspace({
        entries: [
          buildTestEntry({
            id: "c1",
            category: "carryover",
            occurredOn: "2026-01-01",
            quantity: 10,
          }),
        ],
        lockState: { isLocked: lockedThrough !== null, lockedThrough },
      }),
      today: todayInYear,
    });

    expect(status.notices).toEqual(
      shows
        ? [
            {
              id: "previous-year-unlocked",
              tone: "info",
              message: "2026年の帳簿がまだ確定されていません。",
              href: "/lab/ammo-ledger/settings/ledger-lock",
            },
          ]
        : [],
    );
  });

  it("前年の記録がなければ、未確定でも知らせない", () => {
    const status = buildHomeStatus({
      workspace: buildTestWorkspace({
        entries: [
          buildTestEntry({
            id: "c1",
            category: "carryover",
            occurredOn: "2027-01-01",
            quantity: 10,
          }),
        ],
      }),
      today: "2027-02-01",
    });

    expect(status.notices).toEqual([]);
  });

  it("許可の期限、未確認の弾種、前年の未確定の順に並べ、最大3件にする", () => {
    const unconfirmed = { ...testAmmoType, classificationConfirmedAt: null };
    const status = buildHomeStatus({
      workspace: buildPermitWorkspace({
        permits: [
          buildPermit({ id: "expired", grantedOn: "2026-01-01", expiresOn: "2027-01-02" }),
          buildPermit({ id: "late", grantedOn: "2026-01-01", expiresOn: "2027-02-15" }),
          buildPermit({ id: "early", grantedOn: "2026-01-01", expiresOn: "2027-01-25" }),
        ],
        entries: [
          buildTestEntry({
            id: "c1",
            category: "carryover",
            occurredOn: "2026-01-01",
            quantity: 10,
          }),
        ],
        inventoryItems: [{ ammoType: unconfirmed, bookStock: 10 }],
      }),
      today: "2027-01-20",
    });

    expect(status.notices.map((notice) => notice.id)).toEqual([
      "permit-expiring-early",
      "permit-expiring-late",
      "permit-expired-expired",
    ]);
  });

  it("許可の注意がなければ、未確認の弾種を前年の未確定より先に出す", () => {
    const unconfirmed = { ...testAmmoType, classificationConfirmedAt: null };
    const status = buildHomeStatus({
      workspace: buildTestWorkspace({
        entries: [
          buildTestEntry({
            id: "c1",
            category: "carryover",
            occurredOn: "2026-01-01",
            quantity: 10,
          }),
        ],
        inventoryItems: [{ ammoType: unconfirmed, bookStock: 10 }],
      }),
      today: "2027-01-20",
    });

    expect(status.notices.map((notice) => notice.id)).toEqual([
      "unconfirmed-ammo-types",
      "previous-year-unlocked",
    ]);
  });
});

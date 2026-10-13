import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireAmmoUser } from "@/features/ammo-ledger/auth/require-ammo-user";
import { ServerActionRateLimitError } from "@/features/ammo-ledger/auth/server-action-rate-limit/server-action-rate-limit-error";
import { buildRangePickerData } from "@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data";
import { GET } from "./route";

vi.mock("@/features/ammo-ledger/auth/require-ammo-user", () => ({
  requireAmmoUser: vi.fn(),
}));
vi.mock("@/features/ammo-ledger/catalog/build-range-picker-data/build-range-picker-data", () => ({
  buildRangePickerData: vi.fn(),
}));
vi.mock(
  "@/features/ammo-ledger/catalog/build-counterparty-picker-data/build-counterparty-picker-data",
  () => ({ buildCounterpartyPickerData: vi.fn() }),
);

const request = new Request("http://localhost/api/ammo-ledger/picker?kind=range");

describe("GET /api/ammo-ledger/picker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("読み込みのレート制限に当たったら 429 と日本語のエラーを返す", async () => {
    vi.mocked(requireAmmoUser).mockRejectedValue(new ServerActionRateLimitError());

    const response = await GET(request);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "操作が多すぎます。しばらくしてからお試しください。",
    });
    expect(buildRangePickerData).not.toHaveBeenCalled();
  });

  it("レート制限以外の例外はそのまま投げる", async () => {
    vi.mocked(requireAmmoUser).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(GET(request)).rejects.toThrow("NEXT_REDIRECT");
  });
});

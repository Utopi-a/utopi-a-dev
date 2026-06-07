import { describe, expect, it } from "vitest";
import { buildAddressCatalog } from "./build-address-catalog";

describe("buildAddressCatalog", () => {
  it("電話番号一致では sportsgun を nikkaren より優先する", () => {
    const catalog = buildAddressCatalog({
      sportsgunRanges: [
        {
          name: "那須国際射撃場",
          postalCode: null,
          address: "栃木県那須郡那須町大字高久甲3900番地",
          phone: "0287-62-1471",
          detailUrl: null,
          area: "kanto_koushinetsu",
        },
      ],
      nikkarenShops: [
        {
          listNumber: 1,
          name: "(株)那須国際射撃場",
          prefecture: "栃木県",
          location: "那須郡那須町大字高久甲3900番地",
          address: "栃木県那須郡那須町大字高久甲3900番地",
          kind: "shop",
          phone: "0287-62-1471",
        },
      ],
    });

    expect(catalog.lookupByPhone({ phone: "0287-62-1471" })).toMatchObject({
      source: "sportsgun",
    });
  });

  it("名前の部分一致で sportsgun を引ける", () => {
    const catalog = buildAddressCatalog({
      sportsgunRanges: [
        {
          name: "仙台綜合射撃場",
          postalCode: "989-3212",
          address: "宮城県仙台市青葉区芋沢権現森山47",
          phone: "022-394-2392",
          detailUrl: null,
          area: "hokkaido_tohoku",
        },
      ],
      nikkarenShops: [],
    });

    expect(catalog.lookupByName({ name: "仙台綜合" })).toMatchObject({
      source: "sportsgun",
      address: "宮城県仙台市青葉区芋沢権現森山47",
    });
  });
});

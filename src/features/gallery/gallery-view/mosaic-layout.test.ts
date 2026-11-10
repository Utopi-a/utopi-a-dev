import { describe, expect, it } from "vitest";
import { type MosaicLayout, type MosaicTile, placeMosaicTiles } from "./mosaic-layout";

const desktop: MosaicLayout = {
  columns: 12,
  columnWidth: 83.33,
  gap: 8,
  rowUnitsPerColumn: 12,
  sizing: "rhythm",
  spans: {
    slim: [3, 3],
    tall: [3, 6],
    square: [3, 6],
    wide: [4, 8],
    panorama: [12, 12],
  },
};

const phone: MosaicLayout = {
  columns: 6,
  columnWidth: 50.5,
  gap: 8,
  rowUnitsPerColumn: 6,
  sizing: "pairs",
  spans: {
    slim: [3, 3],
    tall: [3, 6],
    square: [3, 6],
    wide: [6, 6],
    panorama: [6, 6],
  },
};

const WIDE = 4 / 3;
const TALL = 3 / 4;

function place({ ratios, layout }: { ratios: number[]; layout: MosaicLayout }) {
  return placeMosaicTiles({ photos: ratios.map((ratio) => ({ ratio })), layout });
}

function expectNoOverlap({ tiles, layout }: { tiles: MosaicTile[]; layout: MosaicLayout }) {
  const taken = new Set<string>();
  for (const tile of tiles) {
    expect(tile.column).toBeGreaterThanOrEqual(1);
    expect(tile.column + tile.columnSpan - 1).toBeLessThanOrEqual(layout.columns);
    for (let r = tile.row; r < tile.row + tile.rowSpan; r += 1) {
      for (let c = tile.column; c < tile.column + tile.columnSpan; c += 1) {
        expect(taken.has(`${r}:${c}`)).toBe(false);
        taken.add(`${r}:${c}`);
      }
    }
  }
}

describe("placeMosaicTiles", () => {
  it("写真が無ければ空を返す", () => {
    expect(place({ ratios: [], layout: desktop })).toEqual([]);
  });

  it("縦横比が混ざっても、全部の写真を重ならず格子の中に置く", () => {
    const ratios = [WIDE, TALL, 1, WIDE, 4, 0.42, 1.5, TALL, WIDE, 1.78, TALL, 1, WIDE, 0.66];
    for (const layout of [desktop, phone]) {
      const tiles = place({ ratios, layout });
      expect(tiles).toHaveLength(ratios.length);
      expectNoOverlap({ tiles, layout });
    }
  });

  it("大 1 枚の脇に小 2 枚が高さぴったりで積まれ、3 枚で長方形になる", () => {
    const [large, first, second] = place({ ratios: [WIDE, WIDE, WIDE], layout: desktop });

    expect(large).toMatchObject({ column: 1, columnSpan: 8, row: 1 });
    expect(first).toMatchObject({ column: 9, columnSpan: 4, row: 1 });
    expect(second).toMatchObject({ column: 9, columnSpan: 4 });
    // 小の 2 枚目の下端が、大の下端と同じ段になる
    expect(second.row + second.rowSpan).toBe(large.row + large.rowSpan);
  });

  it("大は 5 枚に 1 枚で、左右交互に寄せる", () => {
    const ratios = Array<number>(11).fill(WIDE);
    const tiles = place({ ratios, layout: desktop });

    expect(tiles.flatMap((tile, index) => (tile.columnSpan === 8 ? [index] : []))).toEqual([
      0, 5, 10,
    ]);
    expect(tiles[0].column).toBe(1);
    expect(tiles[5].column + tiles[5].columnSpan - 1).toBe(desktop.columns);
    expect(tiles[10].column).toBe(1);
  });

  it("大にできない形の写真の番なら、次の写真を大にする", () => {
    const tiles = place({ ratios: [4, WIDE], layout: desktop });

    expect(tiles[0].columnSpan).toBe(12);
    expect(tiles[1].columnSpan).toBe(8);
  });

  it("小のタイルが入らない余りが出る行は、タイルを右端に寄せる", () => {
    // 大 8 列の脇に幅 3 列の正方形を置くと、右に 1 列余る
    const [, square] = place({ ratios: [WIDE, 1], layout: desktop });

    expect(square.column + square.columnSpan - 1).toBe(desktop.columns);
  });

  it("近い比の写真は基準の形に揃え、離れた比の写真は実際の形にする", () => {
    const [, fourThree, threeTwo, wideVideo] = place({
      ratios: [1, WIDE, 1.5, 16 / 9],
      layout: desktop,
    });

    expect(threeTwo.rowSpan).toBe(fourThree.rowSpan);
    expect(wideVideo.rowSpan).toBeLessThan(fourThree.rowSpan);
  });

  it("スマホは半幅を 2 枚組にし、相手がいない写真は全幅にする", () => {
    const tiles = place({ ratios: [TALL, TALL, TALL, WIDE, TALL], layout: phone });

    // 先頭は全幅、続く 2 枚は組、最後の縦長は相手がいないので全幅
    expect(tiles.map((tile) => tile.columnSpan)).toEqual([6, 3, 3, 6, 6]);
    expect(tiles[1].row).toBe(tiles[2].row);
    expect(tiles[2].column).toBe(4);
  });
});

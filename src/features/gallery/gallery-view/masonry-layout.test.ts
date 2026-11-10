import { describe, expect, it } from "vitest";
import {
  type MasonryLayout,
  type MasonryTile,
  placeMasonryTiles,
  ROW_UNITS_PER_COLUMN,
} from "./masonry-layout";

const desktop: MasonryLayout = {
  columns: 3,
  columnWidth: 357.33,
  gap: 8,
  placement: "shortest-column",
};
const phone: MasonryLayout = { columns: 2, columnWidth: 167.5, gap: 8, placement: "pairs" };

const WIDE = 4 / 3;
const TALL = 3 / 4;

function expectNoOverlap({ tiles }: { tiles: MasonryTile[] }) {
  const taken = new Set<string>();
  for (const tile of tiles) {
    for (let r = tile.row; r < tile.row + tile.rowSpan; r += 1) {
      for (let c = tile.column; c < tile.column + tile.columnSpan; c += 1) {
        expect(taken.has(`${r}:${c}`)).toBe(false);
        taken.add(`${r}:${c}`);
      }
    }
  }
}

function tileRatio({ tile, layout }: { tile: MasonryTile; layout: MasonryLayout }) {
  const unit = (layout.columnWidth + layout.gap) / ROW_UNITS_PER_COLUMN;
  const width = tile.columnSpan * layout.columnWidth + (tile.columnSpan - 1) * layout.gap;
  return width / (tile.rowSpan * unit);
}

describe("placeMasonryTiles", () => {
  it("写真が無ければ空を返す", () => {
    expect(placeMasonryTiles({ ratios: [], layout: desktop })).toEqual([]);
  });

  it("縦横比が混ざっても重ならず、タイルが元の比率のままになる", () => {
    const ratios = [TALL, WIDE, 1, 1.5, 16 / 9, 4, 0.42, WIDE, TALL, 0.66];
    for (const layout of [desktop, phone]) {
      const tiles = placeMasonryTiles({ ratios, layout });
      expect(tiles).toHaveLength(ratios.length);
      expectNoOverlap({ tiles });
      tiles.forEach((tile, index) => {
        expect(tileRatio({ tile, layout }) / ratios[index]).toBeCloseTo(1, 1);
      });
    }
  });

  it("次の写真は、いちばん背の低い列に積む", () => {
    const tiles = placeMasonryTiles({ ratios: [TALL, WIDE, TALL, WIDE], layout: desktop });

    expect(tiles.map((tile) => tile.column)).toEqual([1, 2, 3, 2]);
    expect(tiles[3].row).toBeGreaterThan(tiles[1].row + tiles[1].rowSpan - 1);
  });

  it("列の中では、前の写真との間に同じ隙間を空ける", () => {
    const tiles = placeMasonryTiles({ ratios: [WIDE, WIDE, WIDE, WIDE], layout: desktop });
    const unit = (desktop.columnWidth + desktop.gap) / ROW_UNITS_PER_COLUMN;

    const gapRows = tiles[3].row - (tiles[0].row + tiles[0].rowSpan);
    expect(gapRows * unit).toBeCloseTo(desktop.gap, 0);
  });

  it("スマホは横長を全幅に、縦長と正方形を 2 枚組にする", () => {
    const tiles = placeMasonryTiles({ ratios: [WIDE, TALL, 1, 16 / 9], layout: phone });

    expect(tiles.map((tile) => tile.columnSpan)).toEqual([2, 1, 1, 2]);
    expect(tiles[1].row).toBe(tiles[2].row);
    expect(tiles[2].column).toBe(2);
  });

  it("スマホで相手がいない縦長は全幅にし、極端に細長い写真は半幅のままにする", () => {
    const [tall, wide, slim] = placeMasonryTiles({ ratios: [TALL, WIDE, 0.42], layout: phone });

    expect(tall.columnSpan).toBe(2);
    expect(wide.columnSpan).toBe(2);
    expect(slim.columnSpan).toBe(1);
  });
});

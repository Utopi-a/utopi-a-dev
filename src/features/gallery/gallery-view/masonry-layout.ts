/** タイルを置く格子。写真の縦横比をそのまま保てるよう、段は列の幅を 96 等分した細かい高さにする。 */
export type MasonryLayout = {
  columns: number;
  /** 代表の画面幅での列の幅（px）。段数の計算に使う。 */
  columnWidth: number;
  gap: number;
  /** 列ごとに積むか、横長を全幅にして半幅を 2 枚組にするか。 */
  placement: "shortest-column" | "pairs";
};

export type MasonryTile = {
  column: number;
  columnSpan: number;
  row: number;
  rowSpan: number;
};

export const ROW_UNITS_PER_COLUMN = 96;
const WIDE_RATIO = 1.15;
// 極端に細長い写真は、全幅にすると画面より高くなるので、相手がいなくても半幅のままにする
const SLIM_RATIO = 0.6;

function rowUnit({ layout }: { layout: MasonryLayout }) {
  return (layout.columnWidth + layout.gap) / ROW_UNITS_PER_COLUMN;
}

function gapRows({ layout }: { layout: MasonryLayout }) {
  return Math.max(1, Math.round(layout.gap / rowUnit({ layout })));
}

function rowSpanFor({
  columnSpan,
  ratio,
  layout,
}: {
  columnSpan: number;
  ratio: number;
  layout: MasonryLayout;
}) {
  const width = columnSpan * layout.columnWidth + (columnSpan - 1) * layout.gap;
  return Math.max(1, Math.round(width / ratio / rowUnit({ layout })));
}

/** 次の写真を、いちばん背の低い列に積む。高さが同じなら左の列を選ぶ。 */
function stackInShortestColumn({
  ratios,
  layout,
}: {
  ratios: number[];
  layout: MasonryLayout;
}): MasonryTile[] {
  const columnEnds = Array<number>(layout.columns).fill(0);
  const gap = gapRows({ layout });
  return ratios.map((ratio) => {
    const lowest = Math.min(...columnEnds);
    const column = columnEnds.indexOf(lowest);
    const rowSpan = rowSpanFor({ columnSpan: 1, ratio, layout });
    columnEnds[column] = lowest + rowSpan + gap;
    return { column: column + 1, columnSpan: 1, row: lowest + 1, rowSpan };
  });
}

/** スマホ用。横長は全幅、それ以外は半幅の 2 枚組にして、1 枚を大きく見せる。 */
function flowInPairs({
  ratios,
  layout,
}: {
  ratios: number[];
  layout: MasonryLayout;
}): MasonryTile[] {
  const gap = gapRows({ layout });
  const isHalf = (ratio: number | undefined) => ratio !== undefined && ratio < WIDE_RATIO;
  const tiles: MasonryTile[] = [];
  let row = 0;
  for (let index = 0; index < ratios.length; index += 1) {
    const ratio = ratios[index];
    if (isHalf(ratio) && isHalf(ratios[index + 1])) {
      const leftSpan = rowSpanFor({ columnSpan: 1, ratio, layout });
      const rightSpan = rowSpanFor({ columnSpan: 1, ratio: ratios[index + 1], layout });
      tiles.push({ column: 1, columnSpan: 1, row: row + 1, rowSpan: leftSpan });
      tiles.push({ column: 2, columnSpan: 1, row: row + 1, rowSpan: rightSpan });
      row += Math.max(leftSpan, rightSpan) + gap;
      index += 1;
      continue;
    }
    const columnSpan = ratio < SLIM_RATIO ? 1 : layout.columns;
    const rowSpan = rowSpanFor({ columnSpan, ratio, layout });
    tiles.push({ column: 1, columnSpan, row: row + 1, rowSpan });
    row += rowSpan + gap;
  }
  return tiles;
}

/** 写真を切り抜かず、元の縦横比のまま格子に置く。 */
export function placeMasonryTiles({
  ratios,
  layout,
}: {
  ratios: number[];
  layout: MasonryLayout;
}): MasonryTile[] {
  return layout.placement === "pairs"
    ? flowInPairs({ ratios, layout })
    : stackInShortestColumn({ ratios, layout });
}

/** 行の分け方を決めるための、ある画面幅での寸法（px）。 */
export type JustifiedRowsLayout = {
  containerWidth: number;
  targetRowHeight: number;
  gap: number;
};

export type JustifiedItem = {
  /** 行の幅から隙間を除いた長さのうち、この写真が占める割合。 */
  share: number;
  gapsInRow: number;
  /** 行を端まで埋めるか。写真が足りない最後の行だけ false になりうる。 */
  fillsRow: boolean;
};

// 1 行に並べる数の上限。探す範囲を絞り、枚数が増えても計算量が枚数に比例するようにする
const MAX_ITEMS_IN_ROW = 8;
// 最後の行は写真が足りないことがあるので、埋めるために伸ばすのは目標の高さのこの倍率までにする
const MAX_LAST_ROW_STRETCH = 1.6;

function rowHeight({ ratios, layout }: { ratios: number[]; layout: JustifiedRowsLayout }) {
  const totalRatio = ratios.reduce((sum, ratio) => sum + ratio, 0);
  return (layout.containerWidth - (ratios.length - 1) * layout.gap) / totalRatio;
}

/**
 * 写真を順番を変えずに行へ分け、どの行の高さも目標に近くなる分け方を選ぶ。
 * 順に詰めていくだけだと、縦長の写真が 1 枚だけ残った行が極端に高くなるので、全体で比べる。
 * 高さの差は比で測る（2 倍と半分を同じ重さで嫌う）。
 */
export function justifyRows({
  ratios,
  layout,
}: {
  ratios: number[];
  layout: JustifiedRowsLayout;
}): JustifiedItem[] {
  const count = ratios.length;
  const maxLastRowHeight = layout.targetRowHeight * MAX_LAST_ROW_STRETCH;
  const bestCost = [0, ...Array<number>(count).fill(Number.POSITIVE_INFINITY)];
  const rowStart = Array<number>(count + 1).fill(0);

  for (let end = 1; end <= count; end += 1) {
    for (let start = Math.max(0, end - MAX_ITEMS_IN_ROW); start < end; start += 1) {
      const height = rowHeight({ ratios: ratios.slice(start, end), layout });
      const shownHeight = end === count ? Math.min(height, maxLastRowHeight) : height;
      const cost = bestCost[start] + Math.log(shownHeight / layout.targetRowHeight) ** 2;
      if (cost < bestCost[end]) {
        bestCost[end] = cost;
        rowStart[end] = start;
      }
    }
  }

  const items = Array<JustifiedItem>(count);
  for (let end = count; end > 0; end = rowStart[end]) {
    const start = rowStart[end];
    const rowRatios = ratios.slice(start, end);
    const totalRatio = rowRatios.reduce((sum, ratio) => sum + ratio, 0);
    const height = rowHeight({ ratios: rowRatios, layout });
    const scale = end === count && height > maxLastRowHeight ? maxLastRowHeight / height : 1;
    rowRatios.forEach((ratio, offset) => {
      items[start + offset] = {
        share: (ratio / totalRatio) * scale,
        gapsInRow: rowRatios.length - 1,
        fillsRow: scale === 1,
      };
    });
  }
  return items;
}

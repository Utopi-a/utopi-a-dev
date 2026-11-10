import { describe, expect, it } from "vitest";
import { type JustifiedItem, justifyRows } from "./justified-rows";

const layout = { containerWidth: 1000, targetRowHeight: 250, gap: 8 };

/** 割合を足していき、行ごとの枚数に戻す。 */
function rowLengths({ items }: { items: JustifiedItem[] }) {
  const lengths: number[] = [];
  for (let index = 0; index < items.length; index += items[index].gapsInRow + 1) {
    lengths.push(items[index].gapsInRow + 1);
  }
  return lengths;
}

function rowsOf({ items }: { items: JustifiedItem[] }) {
  let start = 0;
  return rowLengths({ items }).map((length) => {
    const row = items.slice(start, start + length);
    start += length;
    return row;
  });
}

describe("justifyRows", () => {
  it("写真が無ければ空を返す", () => {
    expect(justifyRows({ ratios: [], layout })).toEqual([]);
  });

  it("どの行も割合の合計が 1 になり、端まで埋まる", () => {
    const ratios = [1.5, 0.75, 1, 1.33, 4, 0.42, 1.5, 0.75, 1.33, 1.78, 0.75];
    const rows = rowsOf({ items: justifyRows({ ratios, layout }) });

    for (const row of rows) {
      const total = row.reduce((sum, item) => sum + item.share, 0);
      expect(total).toBeCloseTo(1, 10);
      expect(row.every((item) => item.fillsRow)).toBe(true);
    }
  });

  it("全部の写真を、順番を変えずに 1 回ずつ割り当てる", () => {
    const ratios = [1.5, 0.75, 1, 1.33, 4, 0.42];
    const items = justifyRows({ ratios, layout });

    expect(items).toHaveLength(ratios.length);
    expect(rowLengths({ items }).reduce((sum, length) => sum + length, 0)).toBe(ratios.length);
    // 同じ行の中では、割合が縦横比に比例する（高さが揃う）
    const [firstRow] = rowsOf({ items });
    const height = firstRow[0].share / ratios[0];
    firstRow.forEach((item, index) => {
      expect(item.share / ratios[index]).toBeCloseTo(height, 10);
    });
  });

  it("縦長の写真を 1 枚だけの行にしない", () => {
    const ratios = [1.5, 1.5, 1.5, 0.75, 1.5, 1.5];
    const rows = rowsOf({ items: justifyRows({ ratios, layout }) });

    expect(rows.every((row) => row.length > 1)).toBe(true);
  });

  it("写真が足りないときは、引き伸ばしすぎず端を空ける", () => {
    const [item] = justifyRows({ ratios: [0.75], layout });

    expect(item.fillsRow).toBe(false);
    // 高さ 400px（目標の 1.6 倍）のときの幅 300px が、行の幅に占める割合
    expect(item.share).toBeCloseTo(0.3, 10);
  });
});

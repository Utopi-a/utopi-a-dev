export type PhotoShape = "slim" | "tall" | "square" | "wide" | "panorama";

/** タイルを置く格子。段は列の幅を rowUnitsPerColumn 等分した高さで、写真の形に細かく合わせるために刻む。 */
export type MosaicLayout = {
  columns: number;
  /** 代表の画面幅での列の幅（px）。段数の計算に使う。 */
  columnWidth: number;
  gap: number;
  rowUnitsPerColumn: number;
  /** 写真の形ごとの、小と大の幅（列数）。 */
  spans: Record<PhotoShape, readonly [small: number, large: number]>;
  /** 大小の決め方。rhythm は一定の間隔で大を入れ、pairs は半幅のタイルを 2 枚組にする。 */
  sizing: "rhythm" | "pairs";
};

export type MosaicTile = {
  column: number;
  columnSpan: number;
  row: number;
  rowSpan: number;
};

/** タイルの下に空ける段数。列の隙間とほぼ同じ高さになる。 */
const ROW_GAP_UNITS = 1;
/** 大のタイルを入れる間隔。 */
const LARGE_EVERY = 5;
// 形の基準の比から、この倍率までの写真は基準の形に揃える。3:2 のカメラと 2:3 の縦位置がここに入る
const SNAP_TOLERANCE = 1.13;
const NOMINAL_RATIOS: Partial<Record<PhotoShape, number>> = { wide: 4 / 3, square: 1, tall: 3 / 4 };

function shapeOf({ ratio }: { ratio: number }): PhotoShape {
  if (ratio >= 2.2) return "panorama";
  if (ratio >= 1.15) return "wide";
  if (ratio >= 0.87) return "square";
  // 極端に細長い写真は、普通の縦長と同じ扱いにすると画面より高くなるので分ける
  return ratio >= 0.6 ? "tall" : "slim";
}

function snappedRatio({ ratio, shape }: { ratio: number; shape: PhotoShape }) {
  const nominal = NOMINAL_RATIOS[shape];
  if (nominal === undefined) return null;
  const difference = Math.max(ratio / nominal, nominal / ratio);
  return difference <= SNAP_TOLERANCE ? nominal : null;
}

function rowSpanFor({
  columnSpan,
  ratio,
  layout,
}: {
  columnSpan: number;
  ratio: number;
  layout: MosaicLayout;
}) {
  const unit = (layout.columnWidth + layout.gap) / layout.rowUnitsPerColumn;
  const width = columnSpan * layout.columnWidth + (columnSpan - 1) * layout.gap;
  return Math.max(1, Math.round(width / ratio / unit));
}

function canBeLarge({ shape }: { shape: PhotoShape }) {
  return shape === "wide" || shape === "square" || shape === "tall";
}

/** 間隔を数えて大を決める。形の都合で大にできない写真は飛ばし、次の写真へ送る。 */
function rhythmIsLarge({ shapes }: { shapes: PhotoShape[] }) {
  let sinceLarge = LARGE_EVERY;
  return shapes.map((shape) => {
    if (sinceLarge >= LARGE_EVERY && canBeLarge({ shape })) {
      sinceLarge = 1;
      return true;
    }
    sinceLarge += 1;
    return false;
  });
}

/** 半幅のタイルを 2 枚組にする。相手がいない写真は全幅にして、半分だけ空いた行を作らない。 */
function pairedIsLarge({ shapes, layout }: { shapes: PhotoShape[]; layout: MosaicLayout }) {
  const isHalf = (shape: PhotoShape | undefined) =>
    shape !== undefined && layout.spans[shape][0] * 2 === layout.columns;
  const large = shapes.map(() => false);
  for (let index = 0; index < shapes.length; index += 1) {
    if (!isHalf(shapes[index])) continue;
    // 先頭は入口の見せ場として全幅にする
    if (index > 0 && isHalf(shapes[index + 1])) {
      index += 1;
    } else {
      large[index] = shapes[index] !== "slim";
    }
  }
  return large;
}

/**
 * 写真を大と小のタイルにして、上から順に入る最初の場所へ置く。
 * 大は小のちょうど 2 倍にし、大の脇に小 2 枚が高さぴったりで積めるようにする。大は左右交互に寄せる。
 * 行の右に小のタイルが入らない余りが出るときは、タイルを右端に寄せて隙間を内側へ移し、外周を揃える。
 */
export function placeMosaicTiles({
  photos,
  layout,
}: {
  photos: { ratio: number }[];
  layout: MosaicLayout;
}): MosaicTile[] {
  const shapes = photos.map(({ ratio }) => shapeOf({ ratio }));
  const isLarge =
    layout.sizing === "rhythm" ? rhythmIsLarge({ shapes }) : pairedIsLarge({ shapes, layout });
  const narrowestSpan = Math.min(...Object.values(layout.spans).map(([small]) => small));
  const occupied: boolean[][] = [];

  function fits({
    row,
    column,
    columnSpan,
    height,
  }: {
    row: number;
    column: number;
    columnSpan: number;
    height: number;
  }) {
    if (column < 0 || column + columnSpan > layout.columns) return false;
    for (let r = row; r < row + height; r += 1) {
      for (let c = column; c < column + columnSpan; c += 1) {
        if (occupied[r]?.[c]) return false;
      }
    }
    return true;
  }

  function freeColumnsToRight({ row, from }: { row: number; from: number }) {
    let free = 0;
    while (from + free < layout.columns && !occupied[row]?.[from + free]) free += 1;
    return free;
  }

  function findPlace({
    columnSpan,
    height,
    side,
    startRow,
  }: {
    columnSpan: number;
    height: number;
    side: "left" | "right" | null;
    startRow: number;
  }) {
    const last = layout.columns - columnSpan;
    // 大は決めた側の端にだけ置く。空いている所へ入れると、左右交互の並びが崩れる
    const columns =
      side === "left"
        ? [0]
        : side === "right"
          ? [last]
          : Array.from({ length: last + 1 }, (_, c) => c);
    for (let row = startRow; ; row += 1) {
      for (const column of columns) {
        if (!fits({ row, column, columnSpan, height })) continue;
        const leftover = freeColumnsToRight({ row, from: column + columnSpan });
        const shifted = column + leftover;
        const shouldShift =
          side === null &&
          leftover > 0 &&
          leftover < narrowestSpan &&
          // 寄せるのは右端まで空いているときだけ。別のタイルの手前で寄せると、左端が空いて外周が崩れる
          column + columnSpan + leftover === layout.columns &&
          fits({ row, column: shifted, columnSpan, height });
        return { row, column: shouldShift ? shifted : column };
      }
    }
  }

  let firstOpenRow = 0;
  let largePlaced = 0;
  return photos.map(({ ratio }, index) => {
    const shape = shapes[index];
    const [smallSpan, largeSpan] = layout.spans[shape];
    const large = isLarge[index];
    const columnSpan = large ? largeSpan : smallSpan;
    const snapped = snappedRatio({ ratio, shape });
    const smallRowSpan = rowSpanFor({ columnSpan: smallSpan, ratio: snapped ?? ratio, layout });
    // 小 2 枚と隙間の高さに合わせる。別々に丸めると、積んだときに辺が 1 段ずれる
    const rowSpan =
      large && snapped !== null && largeSpan === smallSpan * 2
        ? smallRowSpan * 2 + ROW_GAP_UNITS
        : rowSpanFor({ columnSpan, ratio: snapped ?? ratio, layout });
    const height = rowSpan + ROW_GAP_UNITS;

    while (occupied[firstOpenRow]?.every(Boolean)) firstOpenRow += 1;

    const side = large ? (largePlaced % 2 === 0 ? "left" : "right") : null;
    if (large) largePlaced += 1;
    const { row, column } = findPlace({ columnSpan, height, side, startRow: firstOpenRow });
    for (let r = row; r < row + height; r += 1) {
      occupied[r] ??= Array<boolean>(layout.columns).fill(false);
      occupied[r].fill(true, column, column + columnSpan);
    }
    return { column: column + 1, columnSpan, row: row + 1, rowSpan };
  });
}

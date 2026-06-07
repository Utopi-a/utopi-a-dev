import type {
  RepeatingRowColumnDef,
  RepeatingRowMap,
} from "../../form-template/form-template-types";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

function formatColumn(column: RepeatingRowColumnDef): string {
  const parts = [
    `id: "${column.id}"`,
    `x: ${roundMm({ value: column.x })}`,
    `width: ${roundMm({ value: column.width })}`,
    `fontSize: ${roundMm({ value: column.fontSize })}`,
  ];

  if (column.align) {
    parts.push(`align: "${column.align}"`);
  }
  if (column.verticalAlign) {
    parts.push(`verticalAlign: "${column.verticalAlign}"`);
  }
  if (column.fitText === false) {
    parts.push("fitText: false");
  }
  if (column.variant) {
    parts.push(`variant: "${column.variant}"`);
  }
  if (column.yOffset !== undefined) {
    parts.push(`yOffset: ${roundMm({ value: column.yOffset })}`);
  }
  if (column.height !== undefined) {
    parts.push(`height: ${roundMm({ value: column.height })}`);
  }

  return `      { ${parts.join(", ")} }`;
}

export function serializeRepeatingRows({
  repeatingRows,
}: {
  repeatingRows: RepeatingRowMap;
}): string {
  const columns = repeatingRows.columns.map((column) => formatColumn(column)).join(",\n");
  return `repeatingRows: {
    startY: ${roundMm({ value: repeatingRows.startY })},
    rowHeight: ${roundMm({ value: repeatingRows.rowHeight })},
    maxRowsPerPage: ${repeatingRows.maxRowsPerPage},
    columns: [
${columns},
    ],
  }`;
}

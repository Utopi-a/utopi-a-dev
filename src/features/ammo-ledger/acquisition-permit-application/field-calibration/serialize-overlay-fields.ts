import type { OverlayFieldDef } from "../form-template/form-template-types";

function roundMm({ value }: { value: number }): number {
  return Math.round(value * 100) / 100;
}

function formatField(field: OverlayFieldDef): string {
  const parts = [
    `id: "${field.id}"`,
    `page: ${field.page}`,
    `x: ${roundMm({ value: field.x })}`,
    `y: ${roundMm({ value: field.y })}`,
  ];

  if (field.width !== undefined) {
    parts.push(`width: ${roundMm({ value: field.width })}`);
  }
  if (field.height !== undefined) {
    parts.push(`height: ${roundMm({ value: field.height })}`);
  }
  parts.push(`fontSize: ${roundMm({ value: field.fontSize })}`);
  if (field.align) {
    parts.push(`align: "${field.align}"`);
  }
  if (field.variant) {
    parts.push(`variant: "${field.variant}"`);
  }
  if (field.fitText === false) {
    parts.push("fitText: false");
  }

  return `{ ${parts.join(", ")} }`;
}

export function serializeOverlayFields({ fields }: { fields: OverlayFieldDef[] }): string {
  return fields.map((field) => `${formatField(field)},`).join("\n");
}

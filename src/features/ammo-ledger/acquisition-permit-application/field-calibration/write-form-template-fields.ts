import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OverlayFieldDef } from "../form-template/form-template-types";
import { serializeOverlayFields } from "./serialize-overlay-fields";

export async function writeFormTemplateFields({
  projectRoot,
  relativeFilePath,
  fields,
}: {
  projectRoot: string;
  relativeFilePath: string;
  fields: OverlayFieldDef[];
}): Promise<{ filePath: string; fieldCount: number }> {
  const filePath = path.join(projectRoot, relativeFilePath);
  const content = await readFile(filePath, "utf8");
  const serialized = serializeOverlayFields({ fields })
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  const nextFieldsBlock = `fields: [\n${serialized}\n  ]`;

  const patched = content.replace(/fields:\s*\[[\s\S]*?\n {2}\]/, nextFieldsBlock);
  if (patched === content) {
    throw new Error("fields 配列をファイル内で見つけられませんでした");
  }

  await writeFile(filePath, patched, "utf8");

  return {
    filePath: relativeFilePath,
    fieldCount: fields.length,
  };
}

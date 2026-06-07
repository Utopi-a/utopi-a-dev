import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OverlayFieldDef, RepeatingRowMap } from "../form-template/form-template-types";
import { serializeRepeatingRows } from "./repeating-rows-calibration/serialize-repeating-rows";
import { serializeOverlayFields } from "./serialize-overlay-fields";

export async function writeFormTemplateFields({
  projectRoot,
  relativeFilePath,
  fields,
  repeatingRows,
}: {
  projectRoot: string;
  relativeFilePath: string;
  fields: OverlayFieldDef[];
  repeatingRows?: RepeatingRowMap | null;
}): Promise<{ filePath: string; fieldCount: number }> {
  const filePath = path.join(projectRoot, relativeFilePath);
  const content = await readFile(filePath, "utf8");
  const serialized = serializeOverlayFields({ fields })
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
  const nextFieldsBlock = `fields: [\n${serialized}\n  ]`;

  let patched = content.replace(/fields:\s*\[[\s\S]*?\n {2}\]/, nextFieldsBlock);
  if (patched === content) {
    throw new Error("fields 配列をファイル内で見つけられませんでした");
  }

  if (repeatingRows) {
    const nextRepeatingRowsBlock = serializeRepeatingRows({ repeatingRows });
    const repeatingRowsReplaced = patched.replace(
      /repeatingRows:\s*\{[\s\S]*?\n {2}\}/,
      nextRepeatingRowsBlock,
    );
    if (repeatingRowsReplaced === patched) {
      throw new Error("repeatingRows ブロックをファイル内で見つけられませんでした");
    }
    patched = repeatingRowsReplaced;
  }

  await writeFile(filePath, patched, "utf8");

  return {
    filePath: relativeFilePath,
    fieldCount: fields.length,
  };
}

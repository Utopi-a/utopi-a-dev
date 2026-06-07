import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { OverlayFieldDef, RepeatingRowMap } from "../form-template/form-template-types";
import { serializeRepeatingRows } from "./repeating-rows-calibration/serialize-repeating-rows";
import { serializeOverlayFields } from "./serialize-overlay-fields";

type Delimiter = "[" | "{";

function findMatchingDelimiterEnd({
  content,
  openIndex,
  openDelimiter,
  closeDelimiter,
}: {
  content: string;
  openIndex: number;
  openDelimiter: Delimiter;
  closeDelimiter: "]" | "}";
}): number | null {
  let depth = 0;
  let inString: '"' | "'" | null = null;

  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index];

    if (inString) {
      if (char === inString && content[index - 1] !== "\\") {
        inString = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = char;
      continue;
    }

    if (char === openDelimiter) {
      depth += 1;
    }
    if (char === closeDelimiter) {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }

  return null;
}

function replaceTemplatePropertyBlock({
  content,
  propertyName,
  openDelimiter,
  closeDelimiter,
  nextValue,
}: {
  content: string;
  propertyName: string;
  openDelimiter: Delimiter;
  closeDelimiter: "]" | "}";
  nextValue: string;
}): string | null {
  const propertyPattern = new RegExp(`\\b${propertyName}\\s*:`);
  const match = propertyPattern.exec(content);
  if (!match) {
    return null;
  }

  const openIndex = content.indexOf(openDelimiter, match.index);
  if (openIndex === -1) {
    return null;
  }

  const closeIndex = findMatchingDelimiterEnd({
    content,
    openIndex,
    openDelimiter,
    closeDelimiter,
  });
  if (closeIndex === null) {
    return null;
  }

  return `${content.slice(0, match.index)}${nextValue}${content.slice(closeIndex + 1)}`;
}

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

  const patchedFields = replaceTemplatePropertyBlock({
    content,
    propertyName: "fields",
    openDelimiter: "[",
    closeDelimiter: "]",
    nextValue: nextFieldsBlock,
  });
  if (!patchedFields) {
    throw new Error("fields 配列をファイル内で見つけられませんでした");
  }

  let patched = patchedFields;

  if (repeatingRows) {
    const nextRepeatingRowsBlock = serializeRepeatingRows({ repeatingRows });
    const patchedRepeatingRows = replaceTemplatePropertyBlock({
      content: patched,
      propertyName: "repeatingRows",
      openDelimiter: "{",
      closeDelimiter: "}",
      nextValue: nextRepeatingRowsBlock,
    });
    if (!patchedRepeatingRows) {
      throw new Error("repeatingRows ブロックをファイル内で見つけられませんでした");
    }
    patched = patchedRepeatingRows;
  }

  await writeFile(filePath, patched, "utf8");

  return {
    filePath: relativeFilePath,
    fieldCount: fields.length,
  };
}

export { findMatchingDelimiterEnd, replaceTemplatePropertyBlock };

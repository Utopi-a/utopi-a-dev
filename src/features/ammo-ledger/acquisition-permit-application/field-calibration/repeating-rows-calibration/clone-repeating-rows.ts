import type { RepeatingRowMap } from "../../form-template/form-template-types";

export function cloneRepeatingRows({
  repeatingRows,
}: {
  repeatingRows: RepeatingRowMap;
}): RepeatingRowMap {
  return structuredClone(repeatingRows);
}

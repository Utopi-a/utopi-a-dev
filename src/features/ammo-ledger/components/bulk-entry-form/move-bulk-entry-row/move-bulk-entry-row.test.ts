import { describe, expect, it } from "vitest";
import { moveBulkEntryRow } from "./move-bulk-entry-row";

describe("moveBulkEntryRow", () => {
  it("行の順番を入れ替える", () => {
    const rows = [{ clientId: "a" }, { clientId: "b" }, { clientId: "c" }] as never[];

    expect(moveBulkEntryRow({ rows, fromIndex: 2, toIndex: 0 }).map((row) => row.clientId)).toEqual(
      ["c", "a", "b"],
    );
  });
});

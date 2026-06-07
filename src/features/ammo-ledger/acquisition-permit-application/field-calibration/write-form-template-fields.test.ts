import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { writeFormTemplateFields } from "./write-form-template-fields";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    tempDirs
      .splice(0)
      .map((dir) =>
        import("node:fs/promises").then((fs) => fs.rm(dir, { recursive: true, force: true })),
      ),
  );
});

describe("writeFormTemplateFields", () => {
  it("fields 配列だけを差し替える", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "template-write-"));
    tempDirs.push(tempDir);

    const relativeFilePath = "sample-template.ts";
    const original = `export const sampleTemplate = {
  id: "sample",
  fields: [
    { id: "old", page: 0, x: 1, y: 2, fontSize: 3 },
  ],
};
`;
    await writeFile(path.join(tempDir, relativeFilePath), original, "utf8");

    await writeFormTemplateFields({
      projectRoot: tempDir,
      relativeFilePath,
      fields: [{ id: "new", page: 0, x: 10, y: 20, width: 30, height: 4, fontSize: 2.5 }],
    });

    const updated = await readFile(path.join(tempDir, relativeFilePath), "utf8");
    expect(updated).toContain('id: "new"');
    expect(updated).toContain("width: 30");
    expect(updated).not.toContain('id: "old"');
    expect(updated).toContain('id: "sample"');
  });

  it("repeatingRows ブロックも差し替える", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "template-write-"));
    tempDirs.push(tempDir);

    const relativeFilePath = "supplement-template.ts";
    const original = `export const supplementTemplate = {
  id: "supplement",
  fields: [
    { id: "label", page: 0, x: 1, y: 2, fontSize: 3 },
  ],
  repeatingRows: {
    startY: 50,
    rowHeight: 19,
    maxRowsPerPage: 10,
    columns: [
      { id: "year", x: 23, width: 20, fontSize: 2.8, align: "right", yOffset: 1.2 },
    ],
  },
};
`;
    await writeFile(path.join(tempDir, relativeFilePath), original, "utf8");

    await writeFormTemplateFields({
      projectRoot: tempDir,
      relativeFilePath,
      fields: [{ id: "label", page: 0, x: 2, y: 3, fontSize: 3.2 }],
      repeatingRows: {
        startY: 51,
        rowHeight: 20,
        maxRowsPerPage: 10,
        columns: [{ id: "year", x: 24, width: 21, fontSize: 2.9, align: "right", yOffset: 1.5 }],
      },
    });

    const updated = await readFile(path.join(tempDir, relativeFilePath), "utf8");
    expect(updated).toContain("startY: 51");
    expect(updated).toContain("rowHeight: 20");
    expect(updated).toContain("yOffset: 1.5");
  });

  it("1行の fields 配列も差し替えられる", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "template-write-"));
    tempDirs.push(tempDir);

    const relativeFilePath = "inline-fields-template.ts";
    const original = `export const supplementTemplate = {
  id: "supplement",
  fields: [{ id: "label", page: 0, x: 1, y: 2, fontSize: 3 }],
  repeatingRows: {
    startY: 50,
    rowHeight: 19,
    maxRowsPerPage: 10,
    columns: [{ id: "year", x: 23, width: 20, fontSize: 2.8 }],
  },
};
`;
    await writeFile(path.join(tempDir, relativeFilePath), original, "utf8");

    await writeFormTemplateFields({
      projectRoot: tempDir,
      relativeFilePath,
      fields: [
        { id: "label", page: 0, x: 2, y: 3, fontSize: 3.2 },
        { id: "marker_copy", page: 0, x: 4, y: 5, fontSize: 3 },
      ],
      repeatingRows: {
        startY: 51,
        rowHeight: 18.95,
        maxRowsPerPage: 10,
        columns: [{ id: "year", x: 24, width: 21, fontSize: 2.9 }],
      },
    });

    const updated = await readFile(path.join(tempDir, relativeFilePath), "utf8");
    expect(updated).toContain('id: "marker_copy"');
    expect(updated).toContain("rowHeight: 18.95");
    expect(updated).not.toContain("fields: [{");
  });
});

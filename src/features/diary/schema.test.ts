import { describe, expect, it } from "vitest";
import { diaryEntrySchema } from "./schema";

describe("diaryEntrySchema", () => {
  it("accepts valid input", () => {
    const result = diaryEntrySchema.safeParse({
      title: "Lab day",
      body: "Shipped the starter kit.",
      mood: "focused",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty title", () => {
    const result = diaryEntrySchema.safeParse({
      title: "",
      body: "No title",
    });
    expect(result.success).toBe(false);
  });
});

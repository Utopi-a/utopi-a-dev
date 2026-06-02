import { describe, expect, it } from "vitest";
import { postSchema } from "./schema";

describe("postSchema", () => {
  it("accepts valid slug", () => {
    const result = postSchema.safeParse({
      slug: "utopia-stack",
      title: "Utopia Stack",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = postSchema.safeParse({
      slug: "Bad Slug",
      title: "Invalid",
    });
    expect(result.success).toBe(false);
  });
});

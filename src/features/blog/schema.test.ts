import { describe, expect, it } from "vitest";
import { blogPostSchema } from "./schema";

describe("blogPostSchema", () => {
  it("accepts valid input", () => {
    const result = blogPostSchema.safeParse({
      slug: "hello-world",
      title: "Hello",
      excerpt: "Short intro",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid slug", () => {
    const result = blogPostSchema.safeParse({
      slug: "Hello World",
      title: "Hello",
    });
    expect(result.success).toBe(false);
  });
});

import { z } from "zod";

export const blogPostSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
  body: z.string().min(1).optional(),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

import { z } from "zod";

export const postSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).optional(),
});

export type PostInput = z.infer<typeof postSchema>;

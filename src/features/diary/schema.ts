import { z } from "zod";

export const diaryEntrySchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  mood: z.enum(["calm", "curious", "focused", "tired"]).optional(),
});

export type DiaryEntryInput = z.infer<typeof diaryEntrySchema>;

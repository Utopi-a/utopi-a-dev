import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const diaryEntry = pgTable("diary_entry", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  mood: text("mood"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

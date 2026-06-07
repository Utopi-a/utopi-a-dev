ALTER TABLE "ammo_ledger_entry" ADD COLUMN "day_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, occurred_on
      ORDER BY created_at, id
    ) - 1 AS next_day_order
  FROM ammo_ledger_entry
)
UPDATE ammo_ledger_entry AS entry
SET day_order = ranked.next_day_order
FROM ranked
WHERE entry.id = ranked.id;

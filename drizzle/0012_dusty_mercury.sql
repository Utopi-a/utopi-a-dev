CREATE TABLE "ammo_ledger_lock_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_kind" text NOT NULL,
	"locked_through" text NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_type" RENAME COLUMN "shot_type" TO "cartridge_type";--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "ammo_cartridge_type" text;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "ammo_caliber" text;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "ammo_gauge_number" text;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "ledger_note" text;--> statement-breakpoint
ALTER TABLE "ammo_type" ADD COLUMN "classification_confirmed_at" timestamp;--> statement-breakpoint
UPDATE "ammo_type"
SET "cartridge_type" = CASE "cartridge_type"
	WHEN 'slug' THEN 'shotgun_slug'
	WHEN 'shot' THEN 'shotgun_shot'
	ELSE "cartridge_type"
END;--> statement-breakpoint
UPDATE "ammo_ledger_entry" AS "entry"
SET
	"ammo_cartridge_type" = "type"."cartridge_type",
	"ammo_caliber" = "type"."caliber",
	"ammo_gauge_number" = "type"."gauge_number"
FROM "ammo_type" AS "type"
WHERE "entry"."ammo_type_id" = "type"."id";--> statement-breakpoint
ALTER TABLE "ammo_ledger_lock_event" ADD CONSTRAINT "ammo_ledger_lock_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
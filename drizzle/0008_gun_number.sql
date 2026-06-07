ALTER TABLE "ammo_gun" ADD COLUMN "gun_number" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "ammo_gun" ALTER COLUMN "gun_number" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "gun_number" text;

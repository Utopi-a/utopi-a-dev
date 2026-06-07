CREATE TABLE "ammo_ledger_profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"owner_name" text NOT NULL,
	"owner_address" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_ledger_profile" ADD CONSTRAINT "ammo_ledger_profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

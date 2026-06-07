CREATE TABLE "ammo_permit_event" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"purpose" text NOT NULL,
	"event_kind" text NOT NULL,
	"occurred_on" text NOT NULL,
	"quantity" integer NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD COLUMN "purpose" text DEFAULT 'shooting' NOT NULL;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD COLUMN "purpose" text DEFAULT 'shooting' NOT NULL;--> statement-breakpoint
ALTER TABLE "ammo_permit_event" ADD CONSTRAINT "ammo_permit_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;

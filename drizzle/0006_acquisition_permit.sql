CREATE TABLE "ammo_acquisition_permit" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ledger_purpose" text NOT NULL,
	"name" text NOT NULL,
	"permit_purpose" text NOT NULL,
	"granted_on" text NOT NULL,
	"expires_on" text NOT NULL,
	"quantity" integer NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_permit_event" ADD COLUMN "permit_id" text;--> statement-breakpoint
ALTER TABLE "ammo_acquisition_permit" ADD CONSTRAINT "ammo_acquisition_permit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_permit_event" ADD CONSTRAINT "ammo_permit_event_permit_id_ammo_acquisition_permit_id_fk" FOREIGN KEY ("permit_id") REFERENCES "public"."ammo_acquisition_permit"("id") ON DELETE cascade ON UPDATE no action;

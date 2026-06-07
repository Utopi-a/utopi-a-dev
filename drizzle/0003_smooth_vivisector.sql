CREATE TABLE "ammo_counterparty" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"kind" text DEFAULT 'shop' NOT NULL,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD COLUMN "counterparty_id" text;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD COLUMN "outer_box_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "ammo_counterparty" ADD CONSTRAINT "ammo_counterparty_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_counterparty_id_ammo_counterparty_id_fk" FOREIGN KEY ("counterparty_id") REFERENCES "public"."ammo_counterparty"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "ammo_gun" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"permit_number" text NOT NULL,
	"gun_type" text NOT NULL,
	"caliber" text NOT NULL,
	"purpose" text,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ammo_ledger_entry" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"transaction_id" text,
	"category" text NOT NULL,
	"occurred_on" text NOT NULL,
	"ammo_type_id" text,
	"ammo_type_name" text NOT NULL,
	"quantity" integer NOT NULL,
	"location" text,
	"counterparty_name" text,
	"counterparty_address" text,
	"gun_id" text,
	"gun_name" text,
	"gun_permit_number" text,
	"voided_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ammo_range" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"default_purpose" text,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ammo_transaction" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"status" text NOT NULL,
	"input_kind" text NOT NULL,
	"occurred_on" text NOT NULL,
	"ammo_type_id" text,
	"gun_id" text,
	"range_id" text,
	"box_count" integer DEFAULT 0 NOT NULL,
	"loose_rounds" integer DEFAULT 0 NOT NULL,
	"computed_rounds" integer,
	"counterparty_name" text,
	"counterparty_address" text,
	"memo" text,
	"source_transaction_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ammo_type" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"caliber" text NOT NULL,
	"shot_type" text NOT NULL,
	"rounds_per_box" integer NOT NULL,
	"default_purpose" text,
	"memo" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_gun" ADD CONSTRAINT "ammo_gun_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD CONSTRAINT "ammo_ledger_entry_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD CONSTRAINT "ammo_ledger_entry_transaction_id_ammo_transaction_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."ammo_transaction"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD CONSTRAINT "ammo_ledger_entry_ammo_type_id_ammo_type_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD CONSTRAINT "ammo_ledger_entry_gun_id_ammo_gun_id_fk" FOREIGN KEY ("gun_id") REFERENCES "public"."ammo_gun"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_range" ADD CONSTRAINT "ammo_range_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_ammo_type_id_ammo_type_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_type"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_gun_id_ammo_gun_id_fk" FOREIGN KEY ("gun_id") REFERENCES "public"."ammo_gun"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_range_id_ammo_range_id_fk" FOREIGN KEY ("range_id") REFERENCES "public"."ammo_range"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_type" ADD CONSTRAINT "ammo_type_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "ammo_catalog_favorite" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"catalog_kind" text NOT NULL,
	"catalog_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ammo_counterparty" ADD COLUMN "catalog_id" text;--> statement-breakpoint
ALTER TABLE "ammo_range" ADD COLUMN "catalog_id" text;--> statement-breakpoint
ALTER TABLE "ammo_catalog_favorite" ADD CONSTRAINT "ammo_catalog_favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ammo_catalog_favorite_uidx" ON "ammo_catalog_favorite" USING btree ("user_id","catalog_kind","catalog_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ammo_counterparty_user_catalog_uidx" ON "ammo_counterparty" USING btree ("user_id","catalog_id") WHERE "ammo_counterparty"."catalog_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "ammo_range_user_catalog_uidx" ON "ammo_range" USING btree ("user_id","catalog_id") WHERE "ammo_range"."catalog_id" is not null;

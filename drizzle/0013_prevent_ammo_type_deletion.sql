ALTER TABLE "ammo_ledger_entry" DROP CONSTRAINT "ammo_ledger_entry_ammo_type_id_ammo_type_id_fk";
--> statement-breakpoint
ALTER TABLE "ammo_transaction" DROP CONSTRAINT "ammo_transaction_ammo_type_id_ammo_type_id_fk";
--> statement-breakpoint
ALTER TABLE "ammo_ledger_entry" ADD CONSTRAINT "ammo_ledger_entry_ammo_type_id_ammo_type_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_type"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ammo_transaction" ADD CONSTRAINT "ammo_transaction_ammo_type_id_ammo_type_id_fk" FOREIGN KEY ("ammo_type_id") REFERENCES "public"."ammo_type"("id") ON DELETE restrict ON UPDATE no action;
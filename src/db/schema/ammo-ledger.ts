import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const ammoGun = pgTable("ammo_gun", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  permitNumber: text("permit_number").notNull(),
  gunType: text("gun_type").notNull(),
  caliber: text("caliber").notNull(),
  purpose: text("purpose"),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ammoType = pgTable("ammo_type", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  caliber: text("caliber").notNull(),
  shotType: text("shot_type").notNull(),
  gaugeNumber: text("gauge_number"),
  roundsPerBox: integer("rounds_per_box").notNull(),
  defaultPurpose: text("default_purpose"),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ammoRange = pgTable("ammo_range", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  address: text("address").notNull(),
  defaultPurpose: text("default_purpose"),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ammoTransaction = pgTable("ammo_transaction", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  inputKind: text("input_kind").notNull(),
  occurredOn: text("occurred_on").notNull(),
  ammoTypeId: text("ammo_type_id").references(() => ammoType.id, { onDelete: "set null" }),
  gunId: text("gun_id").references(() => ammoGun.id, { onDelete: "set null" }),
  rangeId: text("range_id").references(() => ammoRange.id, { onDelete: "set null" }),
  boxCount: integer("box_count").notNull().default(0),
  looseRounds: integer("loose_rounds").notNull().default(0),
  computedRounds: integer("computed_rounds"),
  counterpartyName: text("counterparty_name"),
  counterpartyAddress: text("counterparty_address"),
  memo: text("memo"),
  sourceTransactionId: text("source_transaction_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ammoLedgerEntry = pgTable("ammo_ledger_entry", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  transactionId: text("transaction_id").references(() => ammoTransaction.id, {
    onDelete: "set null",
  }),
  category: text("category").notNull(),
  occurredOn: text("occurred_on").notNull(),
  ammoTypeId: text("ammo_type_id").references(() => ammoType.id, { onDelete: "set null" }),
  ammoTypeName: text("ammo_type_name").notNull(),
  quantity: integer("quantity").notNull(),
  location: text("location"),
  counterpartyName: text("counterparty_name"),
  counterpartyAddress: text("counterparty_address"),
  gunId: text("gun_id").references(() => ammoGun.id, { onDelete: "set null" }),
  gunName: text("gun_name"),
  gunPermitNumber: text("gun_permit_number"),
  voidedAt: timestamp("voided_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

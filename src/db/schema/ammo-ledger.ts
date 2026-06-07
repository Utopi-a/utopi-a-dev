import { sql } from "drizzle-orm";
import { integer, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const ammoGun = pgTable("ammo_gun", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  gunNumber: text("gun_number").notNull(),
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

export const ammoCounterparty = pgTable(
  "ammo_counterparty",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    catalogId: text("catalog_id"),
    name: text("name").notNull(),
    address: text("address").notNull(),
    kind: text("kind").notNull().default("shop"),
    memo: text("memo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ammo_counterparty_user_catalog_uidx")
      .on(table.userId, table.catalogId)
      .where(sql`${table.catalogId} is not null`),
  ],
);

export const ammoRange = pgTable(
  "ammo_range",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    catalogId: text("catalog_id"),
    name: text("name").notNull(),
    address: text("address").notNull(),
    defaultPurpose: text("default_purpose"),
    memo: text("memo"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ammo_range_user_catalog_uidx")
      .on(table.userId, table.catalogId)
      .where(sql`${table.catalogId} is not null`),
  ],
);

export const ammoCatalogFavorite = pgTable(
  "ammo_catalog_favorite",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    catalogKind: text("catalog_kind").notNull(),
    catalogId: text("catalog_id").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("ammo_catalog_favorite_uidx").on(table.userId, table.catalogKind, table.catalogId),
  ],
);

export const ammoAcquisitionPermit = pgTable("ammo_acquisition_permit", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  ledgerPurpose: text("ledger_purpose").notNull(),
  name: text("name").notNull(),
  permitPurpose: text("permit_purpose").notNull(),
  grantedOn: text("granted_on").notNull(),
  expiresOn: text("expires_on").notNull(),
  quantity: integer("quantity").notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const ammoPermitEvent = pgTable("ammo_permit_event", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  permitId: text("permit_id").references(() => ammoAcquisitionPermit.id, {
    onDelete: "cascade",
  }),
  purpose: text("purpose").notNull(),
  eventKind: text("event_kind").notNull(),
  occurredOn: text("occurred_on").notNull(),
  quantity: integer("quantity").notNull(),
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
  purpose: text("purpose").notNull().default("shooting"),
  occurredOn: text("occurred_on").notNull(),
  ammoTypeId: text("ammo_type_id").references(() => ammoType.id, { onDelete: "set null" }),
  gunId: text("gun_id").references(() => ammoGun.id, { onDelete: "set null" }),
  rangeId: text("range_id").references(() => ammoRange.id, { onDelete: "set null" }),
  counterpartyId: text("counterparty_id").references(() => ammoCounterparty.id, {
    onDelete: "set null",
  }),
  outerBoxCount: integer("outer_box_count").notNull().default(0),
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

export const ammoLedgerProfile = pgTable("ammo_ledger_profile", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  ownerName: text("owner_name").notNull(),
  ownerAddress: text("owner_address"),
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
  purpose: text("purpose").notNull().default("shooting"),
  occurredOn: text("occurred_on").notNull(),
  ammoTypeId: text("ammo_type_id").references(() => ammoType.id, { onDelete: "set null" }),
  ammoTypeName: text("ammo_type_name").notNull(),
  quantity: integer("quantity").notNull(),
  location: text("location"),
  counterpartyName: text("counterparty_name"),
  counterpartyAddress: text("counterparty_address"),
  gunId: text("gun_id").references(() => ammoGun.id, { onDelete: "set null" }),
  gunName: text("gun_name"),
  gunNumber: text("gun_number"),
  gunPermitNumber: text("gun_permit_number"),
  voidedAt: timestamp("voided_at"),
  dayOrder: integer("day_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

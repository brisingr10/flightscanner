import {
  pgTable,
  uuid,
  varchar,
  char,
  date,
  integer,
  boolean,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";

export const optionTrackers = pgTable(
  "option_trackers",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    expectedPriceKrw: integer("expected_price_krw"),
    note: text("note"),
    startedAt: timestamp("started_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("idx_option_trackers_active").on(table.active, table.expiresAt)]
);

export const legs = pgTable(
  "legs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackerId: varchar("tracker_id", { length: 64 })
      .notNull()
      .references(() => optionTrackers.id, { onDelete: "cascade" }),
    legIndex: integer("leg_index").notNull(),
    fromIata: char("from_iata", { length: 3 }).notNull(),
    toIata: char("to_iata", { length: 3 }).notNull(),
    flightDate: date("flight_date").notNull(),
    airlinePref: varchar("airline_pref", { length: 100 }),
  },
  (table) => [index("idx_legs_tracker").on(table.trackerId, table.legIndex)]
);

export const priceSnapshots = pgTable(
  "price_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackerId: varchar("tracker_id", { length: 64 })
      .notNull()
      .references(() => optionTrackers.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
    totalPriceKrw: integer("total_price_krw"),
    isComplete: boolean("is_complete").notNull().default(false),
    apiCallsUsed: integer("api_calls_used"),
  },
  (table) => [index("idx_snapshots_tracker_time").on(table.trackerId, table.checkedAt)]
);

export const legPrices = pgTable(
  "leg_prices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    snapshotId: uuid("snapshot_id")
      .notNull()
      .references(() => priceSnapshots.id, { onDelete: "cascade" }),
    legIndex: integer("leg_index").notNull(),
    priceKrw: integer("price_krw"),
    airline: varchar("airline", { length: 100 }),
    status: varchar("status", { length: 20 }).notNull(),
    searchUrl: text("search_url"),
  },
  (table) => [index("idx_leg_prices_snapshot").on(table.snapshotId, table.legIndex)]
);

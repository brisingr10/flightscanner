import {
  pgTable,
  uuid,
  varchar,
  char,
  date,
  integer,
  boolean,
  timestamp,
  decimal,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

export const trackers = pgTable(
  "trackers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    origin: char("origin", { length: 3 }).notNull(),
    destination: char("destination", { length: 3 }).notNull(),
    departStart: date("depart_start").notNull(),
    departEnd: date("depart_end").notNull(),
    returnStart: date("return_start").notNull(),
    returnEnd: date("return_end").notNull(),
    adults: integer("adults").notNull().default(1),
    isActive: boolean("is_active").notNull().default(true),
    unsubscribeToken: varchar("unsubscribe_token", { length: 64 })
      .notNull()
      .unique(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    lastCheckedAt: timestamp("last_checked_at"),
    lastEmailedAt: timestamp("last_emailed_at"),
  },
  (table) => [
    index("idx_trackers_email").on(table.email),
    index("idx_trackers_active").on(table.isActive, table.lastCheckedAt),
  ]
);

export const flightResults = pgTable(
  "flight_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackerId: uuid("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
    departureDate: date("departure_date").notNull(),
    returnDate: date("return_date").notNull(),
    airline: varchar("airline", { length: 100 }),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    bookingLink: text("booking_link"),
    outboundSegments: jsonb("outbound_segments"),
    returnSegments: jsonb("return_segments"),
  },
  (table) => [
    index("idx_flight_results_tracker").on(table.trackerId, table.checkedAt),
  ]
);

export const priceHistory = pgTable(
  "price_history",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    trackerId: uuid("tracker_id")
      .notNull()
      .references(() => trackers.id, { onDelete: "cascade" }),
    checkedAt: timestamp("checked_at").defaultNow().notNull(),
    lowestPrice: decimal("lowest_price", { precision: 10, scale: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
  },
  (table) => [
    index("idx_price_history_tracker").on(table.trackerId, table.checkedAt),
  ]
);

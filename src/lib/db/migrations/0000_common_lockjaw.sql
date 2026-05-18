-- Drop old Amadeus-era tables (replaced by option-based model)
DROP TABLE IF EXISTS "price_history" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "flight_results" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "trackers" CASCADE;--> statement-breakpoint
CREATE TABLE "leg_prices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"leg_index" integer NOT NULL,
	"price_krw" integer,
	"airline" varchar(100),
	"status" varchar(20) NOT NULL,
	"search_url" text
);
--> statement-breakpoint
CREATE TABLE "legs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracker_id" varchar(64) NOT NULL,
	"leg_index" integer NOT NULL,
	"from_iata" char(3) NOT NULL,
	"to_iata" char(3) NOT NULL,
	"flight_date" date NOT NULL,
	"airline_pref" varchar(100)
);
--> statement-breakpoint
CREATE TABLE "option_trackers" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"email" varchar(255) NOT NULL,
	"expected_price_krw" integer,
	"note" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tracker_id" varchar(64) NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL,
	"total_price_krw" integer,
	"is_complete" boolean DEFAULT false NOT NULL,
	"api_calls_used" integer
);
--> statement-breakpoint
ALTER TABLE "leg_prices" ADD CONSTRAINT "leg_prices_snapshot_id_price_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "public"."price_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legs" ADD CONSTRAINT "legs_tracker_id_option_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."option_trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_snapshots" ADD CONSTRAINT "price_snapshots_tracker_id_option_trackers_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."option_trackers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_leg_prices_snapshot" ON "leg_prices" USING btree ("snapshot_id","leg_index");--> statement-breakpoint
CREATE INDEX "idx_legs_tracker" ON "legs" USING btree ("tracker_id","leg_index");--> statement-breakpoint
CREATE INDEX "idx_option_trackers_active" ON "option_trackers" USING btree ("active","expires_at");--> statement-breakpoint
CREATE INDEX "idx_snapshots_tracker_time" ON "price_snapshots" USING btree ("tracker_id","checked_at");
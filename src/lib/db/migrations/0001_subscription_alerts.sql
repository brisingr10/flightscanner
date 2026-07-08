CREATE TABLE "alert_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(255) NOT NULL,
  "origin_iata" char(3) NOT NULL,
  "destination_iata" char(3) NOT NULL,
  "departure_start" date NOT NULL,
  "departure_end" date NOT NULL,
  "return_start" date NOT NULL,
  "return_end" date NOT NULL,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "expires_at" timestamp NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "checked_at" timestamp DEFAULT now() NOT NULL,
  "api_calls_used" integer DEFAULT 0 NOT NULL,
  "subscriptions_processed" integer DEFAULT 0 NOT NULL,
  "emails_sent" integer DEFAULT 0 NOT NULL,
  "email_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "idx_alert_subscriptions_active" ON "alert_subscriptions" ("active", "expires_at");
--> statement-breakpoint
CREATE INDEX "idx_alert_subscriptions_email" ON "alert_subscriptions" ("email");
--> statement-breakpoint
CREATE INDEX "idx_subscription_runs_checked_at" ON "subscription_runs" ("checked_at");

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npx drizzle-kit generate   # Generate DB migration from schema changes
npx drizzle-kit push       # Push schema changes directly to DB (dev)
npx drizzle-kit migrate    # Run pending migrations (prod)
```

No test framework is configured.

## Architecture

Next.js 16 App Router full-stack app that tracks flight prices. Users submit a tracker (origin, destination, date ranges, email), and the system searches Amadeus for flights and sends daily email updates for 7 days.

### Data Flow

1. **Tracker creation:** `tracker-form.tsx` → `POST /api/trackers` → validates with Zod → inserts to DB → sends confirmation email + runs first flight check in parallel
2. **Scheduled checks:** GitHub Actions cron (2x daily) calls `POST /api/cron/check-flights?batch=N` for batches 1-5 → fetches 3 active trackers per batch → searches Amadeus → stores results + price history → emails top 5 cheapest flights
3. **Flight search:** Generates all depart/return date combinations (max 5×5=25) → parallel Amadeus API calls via `Promise.allSettled()` → deduplicates and sorts by price

### Key Files

- `src/lib/amadeus.ts` — Amadeus API client singleton, flight search with parallel date combination queries
- `src/lib/check-tracker.ts` — Core business logic: search flights, store results, compare prices, send email
- `src/lib/email.ts` — Resend client, `sendFlightResults()` and `sendConfirmationEmail()`
- `src/lib/validators.ts` — Zod schemas with Korean error messages
- `src/lib/db/schema.ts` — Drizzle schema: `trackers`, `flightResults`, `priceHistory` tables
- `src/emails/flight-results.tsx` — React Email template for flight results
- `src/data/airports.json` — Static airport data (IATA codes, names, cities)

### API Routes

- `POST /api/trackers` — Create tracker (maxDuration: 30s for serverless)
- `POST /api/cron/check-flights?batch=N` — Batch flight check (auth: `Authorization: Bearer {CRON_SECRET}`)
- `GET /api/unsubscribe/[token]` — Redirects to unsubscribe page
- `POST /api/unsubscribe/[token]` — Deactivates tracker

### Stack

- **DB:** Neon serverless PostgreSQL + Drizzle ORM
- **Email:** Resend + React Email
- **Flights:** Amadeus SDK
- **UI:** shadcn/ui + Radix UI + Tailwind CSS v4
- **Forms:** React Hook Form + Zod
- **Deploy:** Vercel (cron via `vercel.json` + GitHub Actions for multi-batch)

### Design Constraints

- Trackers auto-expire after 7 days (`expiresAt` field)
- Cron batches process 3 trackers each to stay within 30s serverless timeout
- Date ranges are capped at 5 days per segment to control Amadeus API costs
- Unsubscribe uses secure random tokens (not tracker IDs)
- UI and validation messages are in Korean

## Environment Variables

See `.env.example`. Required: `DATABASE_URL`, `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `RESEND_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`.

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

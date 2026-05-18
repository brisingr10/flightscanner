// Seed option_trackers + legs rows from src/lib/options.ts.
// Run: node --env-file=.env.local scripts/seed-options.mjs
// Pass --reset to wipe existing rows and re-insert with fresh started_at.

import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL missing in .env.local");
  process.exit(1);
}

const reset = process.argv.includes("--reset");

const OPTIONS = [
  {
    id: "option-1",
    name: "옵션 1 — 오이타→인천 (제주항공 귀국)",
    expectedPriceKrw: 665_000,
    note: null,
    legs: [
      { legIndex: 0, from: "GMP", to: "HND", date: "2026-11-16", airlinePref: "전일본공수" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "OIT", to: "ICN", date: "2026-11-24", airlinePref: "제주항공" },
    ],
  },
  {
    id: "option-2",
    name: "옵션 2 — 후쿠오카→인천 (아시아나 풀세트)",
    expectedPriceKrw: 661_400,
    note: null,
    legs: [
      { legIndex: 0, from: "ICN", to: "NRT", date: "2026-11-16", airlinePref: "아시아나항공" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "FUK", to: "ICN", date: "2026-11-24", airlinePref: "아시아나항공" },
    ],
  },
  {
    id: "option-3",
    name: "옵션 3 — 오이타→김포 (도쿄 경유, ANA 일관)",
    expectedPriceKrw: 570_000,
    note: "이 가격은 leg별 최저가 합산입니다. 실제 ANA 다구간 패키지(약 ₩570k)는 더 저렴할 수 있어요. 정확한 가격은 Google Flights에서 다구간(Multi-city) 탭으로 직접 확인하세요.",
    legs: [
      { legIndex: 0, from: "GMP", to: "HND", date: "2026-11-16", airlinePref: "전일본공수" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "OIT", to: "GMP", date: "2026-11-24", airlinePref: "전일본공수" },
    ],
  },
];

const LIFESPAN_DAYS = 14;
const EMAIL = process.env.ALERT_EMAIL?.trim() ?? "erryiuc10@gmail.com";

const sql = neon(process.env.DATABASE_URL);

const now = new Date();
const expiresAt = new Date(now.getTime() + LIFESPAN_DAYS * 24 * 60 * 60 * 1000);

console.log(`Seeding ${OPTIONS.length} options for ${EMAIL}`);
console.log(`Started: ${now.toISOString()}`);
console.log(`Expires: ${expiresAt.toISOString()} (${LIFESPAN_DAYS} days)`);
console.log(reset ? "Mode: RESET (will delete existing rows first)\n" : "Mode: UPSERT\n");

if (reset) {
  await sql`DELETE FROM option_trackers WHERE id IN ('option-1','option-2','option-3')`;
  console.log("Cleared existing rows.");
}

for (const opt of OPTIONS) {
  await sql`
    INSERT INTO option_trackers (id, name, email, expected_price_krw, note, started_at, expires_at, active)
    VALUES (${opt.id}, ${opt.name}, ${EMAIL}, ${opt.expectedPriceKrw}, ${opt.note}, ${now.toISOString()}, ${expiresAt.toISOString()}, true)
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      expected_price_krw = EXCLUDED.expected_price_krw,
      note = EXCLUDED.note,
      started_at = EXCLUDED.started_at,
      expires_at = EXCLUDED.expires_at,
      active = true
  `;

  await sql`DELETE FROM legs WHERE tracker_id = ${opt.id}`;

  for (const leg of opt.legs) {
    await sql`
      INSERT INTO legs (tracker_id, leg_index, from_iata, to_iata, flight_date, airline_pref)
      VALUES (${opt.id}, ${leg.legIndex}, ${leg.from}, ${leg.to}, ${leg.date}, ${leg.airlinePref ?? null})
    `;
  }

  console.log(`✓ ${opt.id} ${opt.name} (${opt.legs.length} legs)`);
}

console.log("\nDone. Run trigger-cron.mjs to fire a check.");

// Trigger the check-options cron endpoint locally.
// Run: node --env-file=.env.local scripts/trigger-cron.mjs

const url = process.env.TRIGGER_URL ?? "http://localhost:3000/api/cron/check-options";
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("CRON_SECRET missing in .env.local");
  process.exit(1);
}

console.log(`POST ${url}`);

const res = await fetch(url, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const body = await res.text();
console.log(`HTTP ${res.status}\n${body}`);
process.exit(res.ok ? 0 : 1);

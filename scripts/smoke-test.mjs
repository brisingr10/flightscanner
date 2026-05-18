// SerpAPI Google Flights smoke test.
// Run: node --env-file=.env.local scripts/smoke-test.mjs

const SERPAPI_KEY = process.env.SERPAPI_KEY?.trim();
if (!SERPAPI_KEY) {
  console.error("SERPAPI_KEY missing in .env.local");
  process.exit(1);
}

const LEGS = [
  { id: "L1", from: "GMP", to: "HND", date: "2026-11-16", pref: "ANA", prefRe: /(ANA|All Nippon|전일본공수)/i },
  { id: "L2", from: "ICN", to: "NRT", date: "2026-11-16", pref: "Asiana", prefRe: /(Asiana|아시아나)/i },
  { id: "L3", from: "HND", to: "OIT", date: "2026-11-19", pref: "ANA", prefRe: /(ANA|All Nippon|전일본공수)/i },
  { id: "L4", from: "OIT", to: "ICN", date: "2026-11-24", pref: "Jeju", prefRe: /(Jeju|제주항공)/i },
  { id: "L5", from: "FUK", to: "ICN", date: "2026-11-24", pref: "Asiana", prefRe: /(Asiana|아시아나)/i },
  { id: "L6", from: "OIT", to: "GMP", date: "2026-11-24", pref: "ANA", prefRe: /(ANA|All Nippon|전일본공수)/i },
];

const OPTIONS = [
  {
    name: "옵션1 (오이타→인천, 제주항공)",
    legs: ["L1", "L3", "L4"],
    expected: "약 650~680k (사용자 추정)",
  },
  {
    name: "옵션2 (후쿠오카→인천, 아시아나)",
    legs: ["L2", "L3", "L5"],
    expected: "약 661k (사용자 추정)",
  },
  {
    name: "옵션3 (오이타→김포, 도쿄경유 ANA)",
    legs: ["L1", "L3", "L6"],
    expected: "약 570k (사용자 추정)",
  },
];

async function searchLeg(leg) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("type", "2"); // 2 = one-way
  url.searchParams.set("departure_id", leg.from);
  url.searchParams.set("arrival_id", leg.to);
  url.searchParams.set("outbound_date", leg.date);
  url.searchParams.set("currency", "KRW");
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "kr");
  url.searchParams.set("api_key", SERPAPI_KEY);

  const res = await fetch(url);
  const data = await res.json();
  return { status: res.status, data };
}

function fmt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return "₩" + Math.round(n).toLocaleString("ko-KR");
}

function airlinesOf(flight) {
  return (flight.flights || []).map((s) => s.airline).filter(Boolean);
}

function pickCheapest(flights) {
  if (!flights || flights.length === 0) return null;
  return [...flights].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
}

function pickPreferred(flights, prefRe) {
  if (!flights || flights.length === 0 || !prefRe) return null;
  const matches = flights.filter((f) => airlinesOf(f).some((a) => prefRe.test(a)));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
}

function uniqueAirlines(flights) {
  const set = new Set();
  for (const f of flights) for (const a of airlinesOf(f)) set.add(a);
  return [...set];
}

const legResults = {};

console.log("┌─ SerpAPI Google Flights 스모크 테스트 ─┐\n");

for (const leg of LEGS) {
  process.stdout.write(`▶ ${leg.id} ${leg.from}→${leg.to} ${leg.date}  pref=${leg.pref}\n`);
  try {
    const { status, data } = await searchLeg(leg);

    if (data.error) {
      console.log(`  ⚠ API error: ${data.error}\n`);
      legResults[leg.id] = { error: data.error };
      continue;
    }

    if (status !== 200) {
      console.log(`  ⚠ HTTP ${status}\n`);
      legResults[leg.id] = { error: `HTTP ${status}` };
      continue;
    }

    const all = [...(data.best_flights || []), ...(data.other_flights || [])];
    if (all.length === 0) {
      console.log("  결과 없음 (예매 미오픈 가능성)\n");
      legResults[leg.id] = { empty: true };
      continue;
    }

    const cheapest = pickCheapest(all);
    const preferred = pickPreferred(all, leg.prefRe);

    const cheapestAirlines = cheapest ? airlinesOf(cheapest).join("+") : "?";
    const preferredAirlines = preferred ? airlinesOf(preferred).join("+") : "—";
    const allAirlines = uniqueAirlines(all).join(", ");

    console.log(`  최저가:        ${fmt(cheapest?.price).padStart(12)}  [${cheapestAirlines}]`);
    console.log(`  선호(${leg.pref}):     ${fmt(preferred?.price).padStart(12)}  [${preferredAirlines}]`);
    console.log(`  결과 ${all.length}건 / 항공사: ${allAirlines}\n`);

    legResults[leg.id] = {
      cheapest: cheapest?.price ?? null,
      preferred: preferred?.price ?? null,
      cheapestAirlines,
      preferredAirlines,
      total: all.length,
    };
  } catch (e) {
    console.log(`  ⚠ exception: ${e.message}\n`);
    legResults[leg.id] = { error: e.message };
  }
}

console.log("\n┌─ 옵션별 합산 ──────────────────────────┐\n");
for (const opt of OPTIONS) {
  console.log(`📋 ${opt.name}`);
  console.log(`   예상가: ${opt.expected}`);

  let sumCheapest = 0;
  let sumPreferred = 0;
  let cheapestComplete = true;
  let preferredComplete = true;
  const missing = [];

  for (const legId of opt.legs) {
    const r = legResults[legId];
    if (!r || r.error || r.empty) {
      cheapestComplete = false;
      preferredComplete = false;
      missing.push(legId);
      continue;
    }
    if (typeof r.cheapest === "number") sumCheapest += r.cheapest;
    else cheapestComplete = false;
    if (typeof r.preferred === "number") sumPreferred += r.preferred;
    else {
      preferredComplete = false;
      missing.push(`${legId}(선호항공사 없음)`);
    }
  }

  console.log(`   최저가 합:   ${fmt(sumCheapest)}${cheapestComplete ? "" : "  ⚠ 일부 누락"}`);
  console.log(`   선호 합:     ${fmt(sumPreferred)}${preferredComplete ? "" : "  ⚠ 일부 누락"}`);
  if (missing.length > 0) console.log(`   누락: ${missing.join(", ")}`);
  console.log();
}

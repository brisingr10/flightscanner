import { db } from "@/lib/db";
import { optionTrackers, legs, priceSnapshots } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

function fmtKrw(n: number | null): string {
  if (n === null) return "—";
  return "₩" + n.toLocaleString("ko-KR");
}

function fmtKstShort(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${m}-${day} ${hh}:${mm} KST`;
}

export default async function Home() {
  const trackers = await db.select().from(optionTrackers).orderBy(optionTrackers.id);
  const allLegs = await db.select().from(legs);

  const latest = await Promise.all(
    trackers.map(async (t) => {
      const [snap] = await db
        .select()
        .from(priceSnapshots)
        .where(eq(priceSnapshots.trackerId, t.id))
        .orderBy(desc(priceSnapshots.checkedAt))
        .limit(1);
      return { tracker: t, snapshot: snap };
    })
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
          FlightScanner
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          3개 항공권 옵션 일일 모니터링 — Google Flights 데이터 기반
        </p>

        {trackers.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center">
            <p className="text-zinc-500 dark:text-zinc-400">
              아직 등록된 트래커가 없습니다.
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              <code className="bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                node --env-file=.env.local scripts/seed-options.mjs
              </code>
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {latest.map(({ tracker, snapshot }) => {
              const tlegs = allLegs
                .filter((l) => l.trackerId === tracker.id)
                .sort((a, b) => a.legIndex - b.legIndex);
              const daysLeft = Math.max(
                0,
                Math.ceil(
                  (tracker.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
                )
              );

              return (
                <div
                  key={tracker.id}
                  className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
                >
                  <div className="flex items-baseline justify-between">
                    <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {tracker.name}
                    </h2>
                    <span className="text-xs text-zinc-400">D-{daysLeft}</span>
                  </div>

                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {snapshot ? fmtKrw(snapshot.totalPriceKrw) : "체크 전"}
                    </span>
                    {tracker.expectedPriceKrw && (
                      <span className="text-xs text-zinc-500">
                        예상가 {fmtKrw(tracker.expectedPriceKrw)}
                      </span>
                    )}
                    {snapshot && !snapshot.isComplete && (
                      <span className="text-xs text-amber-600">일부 leg 미오픈</span>
                    )}
                  </div>

                  <div className="mt-3 space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                    {tlegs.map((leg) => (
                      <div key={leg.id}>
                        <span className="font-mono">
                          {leg.fromIata} → {leg.toIata}
                        </span>
                        <span className="ml-2">{leg.flightDate}</span>
                        {leg.airlinePref && (
                          <span className="ml-2 text-zinc-400">({leg.airlinePref})</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {tracker.note && (
                    <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded">
                      ⚠ {tracker.note}
                    </p>
                  )}

                  {snapshot && (
                    <p className="mt-3 text-xs text-zinc-400">
                      마지막 체크: {fmtKstShort(snapshot.checkedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <footer className="mt-12 text-xs text-zinc-400 text-center">
          매일 09:00 KST 자동 체크 · SerpAPI 무료 tier · 14일 만료
        </footer>
      </main>
    </div>
  );
}

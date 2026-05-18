import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "./db";
import { legPrices, legs, optionTrackers, priceSnapshots } from "./db/schema";
import { searchLegs, getLegResult, type LegQuery, type LegResult } from "./flights";
import { SERPAPI_MONTHLY_QUOTA } from "./options";
import { sendOptionsUpdate } from "./email";

export interface LegOutput {
  legIndex: number;
  from: string;
  to: string;
  date: string;
  airlinePref: string | null;
  result: LegResult;
}

export interface HistoryPoint {
  checkedAt: Date;
  totalPriceKrw: number | null;
  isComplete: boolean;
}

export interface OptionOutput {
  trackerId: string;
  name: string;
  expectedPriceKrw: number | null;
  note: string | null;
  expiresAt: Date;
  daysUntilExpiry: number;
  totalPriceKrw: number | null;
  isComplete: boolean;
  previousTotalPriceKrw: number | null;
  diffVsYesterday: number | null;
  legs: LegOutput[];
  history: HistoryPoint[];
}

const HISTORY_DAYS = 7;

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export async function checkAllOptions(): Promise<{
  options: OptionOutput[];
  apiCallsThisMonth: number;
  monthlyQuota: number;
}> {
  const now = new Date();
  const trackers = await db
    .select()
    .from(optionTrackers)
    .where(and(eq(optionTrackers.active, true), gte(optionTrackers.expiresAt, now)));

  if (trackers.length === 0) {
    return { options: [], apiCallsThisMonth: 0, monthlyQuota: SERPAPI_MONTHLY_QUOTA };
  }

  const allLegs = await db.select().from(legs);
  const legsByTracker = new Map<string, typeof allLegs>();
  for (const leg of allLegs) {
    const list = legsByTracker.get(leg.trackerId) ?? [];
    list.push(leg);
    legsByTracker.set(leg.trackerId, list);
  }

  const uniqueLegQueries: LegQuery[] = [];
  const seen = new Set<string>();
  for (const tracker of trackers) {
    const tlegs = legsByTracker.get(tracker.id) ?? [];
    for (const leg of tlegs) {
      const key = `${leg.fromIata}|${leg.toIata}|${leg.flightDate}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueLegQueries.push({
          from: leg.fromIata,
          to: leg.toIata,
          date: leg.flightDate,
        });
      }
    }
  }

  const { results, apiCallsUsed } = await searchLegs(uniqueLegQueries);

  const monthStart = startOfMonthUtc();
  const priorThisMonth = await db
    .select({ count: priceSnapshots.apiCallsUsed })
    .from(priceSnapshots)
    .where(gte(priceSnapshots.checkedAt, monthStart));
  const apiCallsPriorThisMonth = priorThisMonth.reduce(
    (sum, row) => sum + (row.count ?? 0),
    0
  );
  const apiCallsThisMonth = apiCallsPriorThisMonth + apiCallsUsed;

  const options: OptionOutput[] = [];

  for (const tracker of trackers) {
    const tlegs = (legsByTracker.get(tracker.id) ?? []).sort(
      (a, b) => a.legIndex - b.legIndex
    );

    const legOutputs: LegOutput[] = tlegs.map((leg) => {
      const result = getLegResult(results, {
        from: leg.fromIata,
        to: leg.toIata,
        date: leg.flightDate,
      })!;
      return {
        legIndex: leg.legIndex,
        from: leg.fromIata,
        to: leg.toIata,
        date: leg.flightDate,
        airlinePref: leg.airlinePref,
        result,
      };
    });

    const allOk = legOutputs.every((l) => l.result.status === "ok");
    const totalPriceKrw = allOk
      ? legOutputs.reduce((sum, l) => sum + (l.result.priceKrw ?? 0), 0)
      : null;

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const prevSnapshot = await db
      .select()
      .from(priceSnapshots)
      .where(
        and(
          eq(priceSnapshots.trackerId, tracker.id),
          lt(priceSnapshots.checkedAt, now),
          gte(priceSnapshots.checkedAt, yesterday)
        )
      )
      .orderBy(desc(priceSnapshots.checkedAt))
      .limit(1);

    const previousTotalPriceKrw =
      prevSnapshot.length > 0 ? prevSnapshot[0].totalPriceKrw : null;
    const diffVsYesterday =
      totalPriceKrw !== null && previousTotalPriceKrw !== null
        ? totalPriceKrw - previousTotalPriceKrw
        : null;

    const [snapshot] = await db
      .insert(priceSnapshots)
      .values({
        trackerId: tracker.id,
        totalPriceKrw,
        isComplete: allOk,
        apiCallsUsed: options.length === 0 ? apiCallsUsed : 0,
      })
      .returning();

    if (legOutputs.length > 0) {
      await db.insert(legPrices).values(
        legOutputs.map((l) => ({
          snapshotId: snapshot.id,
          legIndex: l.legIndex,
          priceKrw: l.result.priceKrw,
          airline: l.result.airline,
          status: l.result.status,
          searchUrl: l.result.searchUrl,
        }))
      );
    }

    const recent = await db
      .select({
        checkedAt: priceSnapshots.checkedAt,
        totalPriceKrw: priceSnapshots.totalPriceKrw,
        isComplete: priceSnapshots.isComplete,
      })
      .from(priceSnapshots)
      .where(eq(priceSnapshots.trackerId, tracker.id))
      .orderBy(desc(priceSnapshots.checkedAt))
      .limit(HISTORY_DAYS);

    options.push({
      trackerId: tracker.id,
      name: tracker.name,
      expectedPriceKrw: tracker.expectedPriceKrw,
      note: tracker.note,
      expiresAt: tracker.expiresAt,
      daysUntilExpiry: Math.max(0, daysBetween(now, tracker.expiresAt)),
      totalPriceKrw,
      isComplete: allOk,
      previousTotalPriceKrw,
      diffVsYesterday,
      legs: legOutputs,
      history: recent,
    });
  }

  await sendOptionsUpdate({
    to: trackers[0].email,
    options,
    apiCallsThisMonth,
    monthlyQuota: SERPAPI_MONTHLY_QUOTA,
  });

  return {
    options,
    apiCallsThisMonth,
    monthlyQuota: SERPAPI_MONTHLY_QUOTA,
  };
}

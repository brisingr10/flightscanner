import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import { alertSubscriptions, subscriptionRuns } from "./db/schema";
import { getLegResult, searchLegs, type LegQuery, type LegResult } from "./flights";
import { SERPAPI_MONTHLY_QUOTA } from "./options";
import { sendSubscriptionDigest } from "./email";

const DAY_MS = 24 * 60 * 60 * 1000;

export const MAX_RANGE_DAYS = 7;
export const SUBSCRIPTION_LIFESPAN_DAYS = 14;

export interface SubscriptionInput {
  email: string;
  origin: string;
  destination: string;
  departureStart: string;
  departureEnd: string;
  returnStart: string;
  returnEnd: string;
}

export interface RankedFlightOption {
  date: string;
  result: LegResult;
}

export interface RankedRangeSummary {
  topOptions: RankedFlightOption[];
  successfulCount: number;
  totalDates: number;
}

export interface SubscriptionDigest {
  subscription: typeof alertSubscriptions.$inferSelect;
  daysRemaining: number;
  outbound: RankedRangeSummary;
  inbound: RankedRangeSummary;
}

interface SubscriptionRunResult {
  digests: SubscriptionDigest[];
  subscriptionsProcessed: number;
  emailsSent: number;
  emailFailures: number;
  apiCallsUsed: number;
  apiCallsThisMonth: number;
  monthlyQuota: number;
}

function normalizeIata(value: string): string {
  return value.trim().toUpperCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.toISOString().slice(0, 10) === value ? parsed : null;
}

function diffDaysInclusive(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1;
}

function enumerateDates(start: string, end: string): string[] {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return [];

  const dates: string[] = [];
  for (let current = startDate.getTime(); current <= endDate.getTime(); current += DAY_MS) {
    dates.push(new Date(current).toISOString().slice(0, 10));
  }
  return dates;
}

function startOfMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function validateRange(startLabel: string, endLabel: string, errors: string[]): void {
  const start = parseIsoDate(startLabel);
  const end = parseIsoDate(endLabel);

  if (!start) {
    errors.push("출발일 또는 귀국일 시작일 형식을 다시 확인해 주세요.");
    return;
  }

  if (!end) {
    errors.push("출발일 또는 귀국일 종료일 형식을 다시 확인해 주세요.");
    return;
  }

  if (end.getTime() < start.getTime()) {
    errors.push("종료일은 시작일과 같거나 그 이후여야 합니다.");
    return;
  }

  if (diffDaysInclusive(start, end) > MAX_RANGE_DAYS) {
    errors.push(`날짜 범위는 최대 ${MAX_RANGE_DAYS}일까지 선택할 수 있습니다.`);
  }
}

export function validateSubscriptionInput(input: SubscriptionInput): SubscriptionInput {
  const normalized: SubscriptionInput = {
    email: input.email.trim(),
    origin: normalizeIata(input.origin),
    destination: normalizeIata(input.destination),
    departureStart: input.departureStart.trim(),
    departureEnd: input.departureEnd.trim(),
    returnStart: input.returnStart.trim(),
    returnEnd: input.returnEnd.trim(),
  };

  const errors: string[] = [];

  if (!isValidEmail(normalized.email)) {
    errors.push("메일을 받아볼 수 있는 이메일 주소를 입력해 주세요.");
  }

  if (!/^[A-Z]{3}$/.test(normalized.origin)) {
    errors.push("출발지는 ICN, GMP처럼 IATA 3자리 코드로 입력해 주세요.");
  }

  if (!/^[A-Z]{3}$/.test(normalized.destination)) {
    errors.push("도착지는 NRT, HND처럼 IATA 3자리 코드로 입력해 주세요.");
  }

  if (normalized.origin === normalized.destination) {
    errors.push("출발지와 도착지는 서로 다르게 입력해 주세요.");
  }

  validateRange(normalized.departureStart, normalized.departureEnd, errors);
  validateRange(normalized.returnStart, normalized.returnEnd, errors);

  const departureStart = parseIsoDate(normalized.departureStart);
  const returnStart = parseIsoDate(normalized.returnStart);
  if (departureStart && returnStart && returnStart.getTime() < departureStart.getTime()) {
    errors.push("귀국일 시작일은 출발일 시작일보다 빠를 수 없습니다.");
  }

  if (errors.length > 0) {
    throw new Error(errors[0]);
  }

  return normalized;
}

function buildRangeQueries(
  origin: string,
  destination: string,
  start: string,
  end: string
): LegQuery[] {
  return enumerateDates(start, end).map((date) => ({
    from: origin,
    to: destination,
    date,
  }));
}

function rankRange(
  results: Map<string, LegResult>,
  queries: LegQuery[]
): RankedRangeSummary {
  const allItems = queries
    .map((query) => {
      const result = getLegResult(results, query);
      if (!result) return null;
      return { date: query.date, result };
    })
    .filter((item): item is RankedFlightOption => item !== null);

  const successful = allItems
    .filter((item) => item.result.status === "ok" && item.result.priceKrw !== null)
    .sort((a, b) => (a.result.priceKrw ?? 0) - (b.result.priceKrw ?? 0));

  if (successful.length > 0) {
    return {
      topOptions: successful.slice(0, 5),
      successfulCount: successful.length,
      totalDates: allItems.length,
    };
  }

  return {
    topOptions: [...allItems].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5),
    successfulCount: 0,
    totalDates: allItems.length,
  };
}

export async function createSubscription(input: SubscriptionInput) {
  const validated = validateSubscriptionInput(input);
  const startedAt = new Date();
  const expiresAt = new Date(startedAt.getTime() + SUBSCRIPTION_LIFESPAN_DAYS * DAY_MS);

  const [subscription] = await db
    .insert(alertSubscriptions)
    .values({
      email: validated.email,
      originIata: validated.origin,
      destinationIata: validated.destination,
      departureStart: validated.departureStart,
      departureEnd: validated.departureEnd,
      returnStart: validated.returnStart,
      returnEnd: validated.returnEnd,
      startedAt,
      expiresAt,
      active: true,
    })
    .returning();

  return subscription;
}

async function runSubscriptionDigests(
  subscriptions: Array<typeof alertSubscriptions.$inferSelect>,
  options?: {
    persistRun?: boolean;
  }
): Promise<SubscriptionRunResult> {
  if (subscriptions.length === 0) {
    return {
      digests: [],
      subscriptionsProcessed: 0,
      emailsSent: 0,
      emailFailures: 0,
      apiCallsUsed: 0,
      apiCallsThisMonth: 0,
      monthlyQuota: SERPAPI_MONTHLY_QUOTA,
    };
  }

  const now = new Date();
  const uniqueQueries = new Map<string, LegQuery>();

  for (const subscription of subscriptions) {
    const outboundQueries = buildRangeQueries(
      subscription.originIata,
      subscription.destinationIata,
      subscription.departureStart,
      subscription.departureEnd
    );
    const inboundQueries = buildRangeQueries(
      subscription.destinationIata,
      subscription.originIata,
      subscription.returnStart,
      subscription.returnEnd
    );

    for (const query of [...outboundQueries, ...inboundQueries]) {
      uniqueQueries.set(`${query.from}|${query.to}|${query.date}`, query);
    }
  }

  const { results, apiCallsUsed } = await searchLegs([...uniqueQueries.values()]);

  const monthStart = startOfMonthUtc();
  const priorRuns = await db
    .select({ apiCallsUsed: subscriptionRuns.apiCallsUsed })
    .from(subscriptionRuns)
    .where(gte(subscriptionRuns.checkedAt, monthStart));
  const apiCallsThisMonth =
    priorRuns.reduce((sum, row) => sum + row.apiCallsUsed, 0) + apiCallsUsed;

  const digests: SubscriptionDigest[] = subscriptions.map((subscription) => {
    const outboundQueries = buildRangeQueries(
      subscription.originIata,
      subscription.destinationIata,
      subscription.departureStart,
      subscription.departureEnd
    );
    const inboundQueries = buildRangeQueries(
      subscription.destinationIata,
      subscription.originIata,
      subscription.returnStart,
      subscription.returnEnd
    );

    return {
      subscription,
      daysRemaining: Math.max(
        0,
        Math.ceil((subscription.expiresAt.getTime() - now.getTime()) / DAY_MS)
      ),
      outbound: rankRange(results, outboundQueries),
      inbound: rankRange(results, inboundQueries),
    };
  });

  let emailsSent = 0;
  let emailFailures = 0;

  for (const digest of digests) {
    try {
      await sendSubscriptionDigest({
        to: digest.subscription.email,
        digest,
        apiCallsThisMonth,
        monthlyQuota: SERPAPI_MONTHLY_QUOTA,
      });
      emailsSent += 1;
    } catch (error) {
      emailFailures += 1;
      console.error("Failed to send subscription digest:", error);
    }
  }

  if (options?.persistRun !== false) {
    await db.insert(subscriptionRuns).values({
      apiCallsUsed,
      subscriptionsProcessed: subscriptions.length,
      emailsSent,
      emailFailures,
    });
  }

  return {
    digests,
    subscriptionsProcessed: subscriptions.length,
    emailsSent,
    emailFailures,
    apiCallsUsed,
    apiCallsThisMonth,
    monthlyQuota: SERPAPI_MONTHLY_QUOTA,
  };
}

export async function sendInitialSubscriptionDigest(
  subscriptionId: string
): Promise<SubscriptionRunResult> {
  const [subscription] = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) {
    throw new Error("방금 생성한 알림을 찾지 못했습니다.");
  }

  return runSubscriptionDigests([subscription]);
}

export async function getActiveSubscriptionCount(): Promise<number> {
  const now = new Date();
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(alertSubscriptions)
    .where(and(eq(alertSubscriptions.active, true), gte(alertSubscriptions.expiresAt, now)));

  return Number(row?.count ?? 0);
}

export async function checkAllSubscriptions(): Promise<SubscriptionRunResult> {
  const now = new Date();
  const activeSubscriptions = await db
    .select()
    .from(alertSubscriptions)
    .where(and(eq(alertSubscriptions.active, true), gte(alertSubscriptions.expiresAt, now)));

  return runSubscriptionDigests(activeSubscriptions);
}

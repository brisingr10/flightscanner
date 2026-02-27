import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackers } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { checkSingleTracker } from "@/lib/check-tracker";

const TRACKERS_PER_BATCH = 3;

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const batch = parseInt(
    request.nextUrl.searchParams.get("batch") ?? "1",
    10
  );
  const offset = (batch - 1) * TRACKERS_PER_BATCH;

  try {
    // Get active trackers that haven't expired (within 7-day window)
    const activeTrackers = await db
      .select()
      .from(trackers)
      .where(
        and(
          eq(trackers.isActive, true),
          sql`${trackers.departEnd} >= CURRENT_DATE`,
          sql`${trackers.expiresAt} > NOW()`
        )
      )
      .limit(TRACKERS_PER_BATCH)
      .offset(offset);

    if (activeTrackers.length === 0) {
      return NextResponse.json({
        message: "No trackers to process in this batch",
        batch,
      });
    }

    const results = [];

    for (const tracker of activeTrackers) {
      try {
        const result = await checkSingleTracker(tracker);
        results.push(result);
      } catch (error) {
        console.error(`Failed to process tracker ${tracker.id}:`, error);
        results.push({
          trackerId: tracker.id,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      batch,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackers } from "@/lib/db/schema";
import { createTrackerSchema } from "@/lib/validators";
import { sendConfirmationEmail } from "@/lib/email";
import { checkSingleTracker } from "@/lib/check-tracker";
import { randomUUID } from "crypto";

const TRACKER_DURATION_DAYS = 7;

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createTrackerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const unsubscribeToken = randomUUID();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + TRACKER_DURATION_DAYS);

    const [tracker] = await db
      .insert(trackers)
      .values({
        email: data.email,
        origin: data.origin,
        destination: data.destination,
        departStart: data.departStart,
        departEnd: data.departEnd,
        returnStart: data.returnStart,
        returnEnd: data.returnEnd,
        adults: data.adults,
        unsubscribeToken,
        expiresAt,
      })
      .returning();

    // Run confirmation email and first flight check in parallel
    await Promise.allSettled([
      sendConfirmationEmail({
        to: data.email,
        origin: data.origin,
        destination: data.destination,
        departRange: `${data.departStart} ~ ${data.departEnd}`,
        returnRange: `${data.returnStart} ~ ${data.returnEnd}`,
        unsubscribeToken,
      }),
      checkSingleTracker(tracker),
    ]);

    return NextResponse.json(
      { id: tracker.id, message: "Tracker created successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create tracker:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackers } from "@/lib/db/schema";
import { createTrackerSchema } from "@/lib/validators";
import { sendConfirmationEmail } from "@/lib/email";
import { randomUUID } from "crypto";

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
      })
      .returning({ id: trackers.id });

    // Send confirmation email (don't block response on it)
    sendConfirmationEmail({
      to: data.email,
      origin: data.origin,
      destination: data.destination,
      departRange: `${data.departStart} to ${data.departEnd}`,
      returnRange: `${data.returnStart} to ${data.returnEnd}`,
      unsubscribeToken,
    }).catch((err) => console.error("Confirmation email failed:", err));

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

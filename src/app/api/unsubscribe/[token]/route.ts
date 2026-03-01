import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET: redirect to the unsubscribe confirmation page.
// Needed for email clients that follow List-Unsubscribe links via GET.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.redirect(`${appUrl}/unsubscribe/${token}`);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  try {
    const result = await db
      .update(trackers)
      .set({ isActive: false })
      .where(eq(trackers.unsubscribeToken, token))
      .returning({ id: trackers.id });

    if (result.length === 0) {
      return NextResponse.json(
        { error: "Tracker not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Successfully unsubscribed" });
  } catch (error) {
    console.error("Unsubscribe failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

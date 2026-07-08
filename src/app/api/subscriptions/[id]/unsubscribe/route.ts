import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { alertSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing subscription ID" }, { status: 400 });
  }

  const [subscription] = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.id, id))
    .limit(1);

  if (!subscription) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>Not found</h1><p>This subscription does not exist.</p></body></html>`,
      { status: 404, headers: { "content-type": "text/html;charset=utf-8" } }
    );
  }

  if (!subscription.active) {
    return new Response(
      `<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>Already unsubscribed</h1><p>This subscription has already been cancelled.</p></body></html>`,
      { status: 200, headers: { "content-type": "text/html;charset=utf-8" } }
    );
  }

  await db
    .update(alertSubscriptions)
    .set({ active: false })
    .where(eq(alertSubscriptions.id, id));

  return new Response(
    `<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1>Unsubscribed</h1><p>You have been unsubscribed from FlightScanner alerts for <strong>${subscription.originIata} → ${subscription.destinationIata}</strong>.</p></body></html>`,
    { status: 200, headers: { "content-type": "text/html;charset=utf-8" } }
  );
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing subscription ID" }, { status: 400 });
  }

  const [subscription] = await db
    .select()
    .from(alertSubscriptions)
    .where(eq(alertSubscriptions.id, id))
    .limit(1);

  if (!subscription) {
    return NextResponse.json({ ok: false, error: "Subscription not found" }, { status: 404 });
  }

  if (!subscription.active) {
    return NextResponse.json({ ok: true, message: "Already unsubscribed" });
  }

  await db
    .update(alertSubscriptions)
    .set({ active: false })
    .where(eq(alertSubscriptions.id, id));

  return NextResponse.json({ ok: true, message: "Unsubscribed successfully" });
}
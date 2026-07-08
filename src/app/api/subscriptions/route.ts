import { NextRequest, NextResponse } from "next/server";
import { createSubscription, sendInitialSubscriptionDigest } from "@/lib/subscriptions";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subscription = await createSubscription({
      email: String(body.email ?? ""),
      origin: String(body.origin ?? ""),
      destination: String(body.destination ?? ""),
      departureStart: String(body.departureStart ?? ""),
      departureEnd: String(body.departureEnd ?? ""),
      returnStart: String(body.returnStart ?? ""),
      returnEnd: String(body.returnEnd ?? ""),
    });

    const initialDigest = await sendInitialSubscriptionDigest(subscription.id);

    return NextResponse.json(
      {
        ok: true,
        initialEmailSent: initialDigest.emailsSent > 0,
        subscription: {
          id: subscription.id,
          email: subscription.email,
          expiresAt: subscription.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "알림 등록에 실패했습니다.",
      },
      { status: 400 }
    );
  }
}

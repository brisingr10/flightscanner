import { NextRequest, NextResponse } from "next/server";
import { checkAllSubscriptions } from "@/lib/subscriptions";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await checkAllSubscriptions();
    const status =
      result.emailFailures > 0 && result.emailsSent === 0
        ? 500
        : 200;

    return NextResponse.json(
      {
        ok: status === 200,
        subscriptionsProcessed: result.subscriptionsProcessed,
        emailsSent: result.emailsSent,
        emailFailures: result.emailFailures,
        apiCallsUsed: result.apiCallsUsed,
        apiCallsThisMonth: result.apiCallsThisMonth,
        monthlyQuota: result.monthlyQuota,
      },
      { status }
    );
  } catch (error) {
    console.error("Cron check-options failed:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

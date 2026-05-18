import { NextRequest, NextResponse } from "next/server";
import { checkAllOptions } from "@/lib/check-options";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const expectedSecret = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { options, apiCallsThisMonth, monthlyQuota } = await checkAllOptions();
    return NextResponse.json({
      ok: true,
      optionsChecked: options.length,
      apiCallsThisMonth,
      monthlyQuota,
      summary: options.map((o) => ({
        id: o.trackerId,
        name: o.name,
        totalPriceKrw: o.totalPriceKrw,
        isComplete: o.isComplete,
        diffVsYesterday: o.diffVsYesterday,
      })),
    });
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

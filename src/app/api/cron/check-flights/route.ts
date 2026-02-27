import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trackers, flightResults, priceHistory } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { searchFlights } from "@/lib/amadeus";
import { sendFlightResults } from "@/lib/email";

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
    // Get active trackers that haven't expired
    const activeTrackers = await db
      .select()
      .from(trackers)
      .where(
        and(
          eq(trackers.isActive, true),
          sql`${trackers.departEnd} >= CURRENT_DATE`
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
        // Search flights via Amadeus
        const flights = await searchFlights({
          origin: tracker.origin,
          destination: tracker.destination,
          departStart: tracker.departStart,
          departEnd: tracker.departEnd,
          returnStart: tracker.returnStart,
          returnEnd: tracker.returnEnd,
          adults: tracker.adults,
          maxResults: 5,
        });

        if (flights.length === 0) {
          results.push({
            trackerId: tracker.id,
            status: "no_flights_found",
          });
          continue;
        }

        // Store flight results
        await db.insert(flightResults).values(
          flights.map((flight) => ({
            trackerId: tracker.id,
            departureDate: flight.departureDate,
            returnDate: flight.returnDate,
            airline: flight.airline,
            price: flight.price.toString(),
            currency: flight.currency,
            bookingLink: flight.bookingLink,
            outboundSegments: flight.outboundSegments,
            returnSegments: flight.returnSegments,
          }))
        );

        // Store price history
        const lowestPrice = flights[0].price;
        await db.insert(priceHistory).values({
          trackerId: tracker.id,
          lowestPrice: lowestPrice.toString(),
          currency: flights[0].currency,
        });

        // Get previous lowest price for comparison
        const previousRecords = await db
          .select({ lowestPrice: priceHistory.lowestPrice })
          .from(priceHistory)
          .where(eq(priceHistory.trackerId, tracker.id))
          .orderBy(sql`${priceHistory.checkedAt} DESC`)
          .limit(2);

        const previousLowest =
          previousRecords.length > 1
            ? parseFloat(previousRecords[1].lowestPrice)
            : null;

        // Send email with results
        await sendFlightResults({
          to: tracker.email,
          origin: tracker.origin,
          destination: tracker.destination,
          flights,
          previousLowest,
          unsubscribeToken: tracker.unsubscribeToken,
        });

        // Update tracker timestamps
        await db
          .update(trackers)
          .set({
            lastCheckedAt: new Date(),
            lastEmailedAt: new Date(),
          })
          .where(eq(trackers.id, tracker.id));

        results.push({
          trackerId: tracker.id,
          status: "success",
          flightsFound: flights.length,
          lowestPrice: lowestPrice,
        });
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

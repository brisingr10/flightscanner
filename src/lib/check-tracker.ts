import { db } from "@/lib/db";
import { flightResults, priceHistory, trackers } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { searchFlights } from "@/lib/amadeus";
import { sendFlightResults } from "@/lib/email";

type Tracker = typeof trackers.$inferSelect;

export async function checkSingleTracker(tracker: Tracker) {
  // Guard: skip inactive or expired trackers
  if (!tracker.isActive) {
    return { trackerId: tracker.id, status: "inactive" as const };
  }

  if (tracker.expiresAt && new Date() > new Date(tracker.expiresAt)) {
    return { trackerId: tracker.id, status: "expired" as const };
  }

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
    return { trackerId: tracker.id, status: "no_flights_found" as const };
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

  return {
    trackerId: tracker.id,
    status: "success" as const,
    flightsFound: flights.length,
    lowestPrice,
  };
}

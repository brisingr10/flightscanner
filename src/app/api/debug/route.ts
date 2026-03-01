import { NextResponse } from "next/server";
import Amadeus from "amadeus";

export async function GET() {
  const debug: Record<string, unknown> = {};

  // Check env vars
  debug.hasClientId = !!process.env.AMADEUS_CLIENT_ID;
  debug.hasClientSecret = !!process.env.AMADEUS_CLIENT_SECRET;
  debug.clientIdLength = process.env.AMADEUS_CLIENT_ID?.length ?? 0;

  try {
    const amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID!,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
    });

    debug.amadeusCreated = true;

    // Test a single search
    const response = await amadeus.shopping.flightOffersSearch.get({
      originLocationCode: "ICN",
      destinationLocationCode: "NRT",
      departureDate: "2026-03-15",
      returnDate: "2026-03-19",
      adults: "1",
      max: "2",
      currencyCode: "USD",
      nonStop: "false",
    });

    debug.searchSuccess = true;
    debug.dataLength = response.data?.length ?? 0;
    debug.statusCode = response.statusCode;

    if (response.data?.[0]) {
      const offer = response.data[0] as Record<string, unknown>;
      debug.samplePrice = (offer.price as Record<string, unknown>)?.total;
    }
  } catch (err: unknown) {
    debug.searchSuccess = false;
    const e = err as Record<string, unknown>;
    debug.errorCode = (e.response as Record<string, unknown>)?.statusCode ?? (e as Record<string, string>).code;
    debug.errorMessage = String(e.description ?? (e as Error).message);
    debug.errorBody = (e.response as Record<string, unknown>)?.body;
  }

  return NextResponse.json(debug);
}

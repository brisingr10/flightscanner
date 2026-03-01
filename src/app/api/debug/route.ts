import { NextResponse } from "next/server";
import Amadeus from "amadeus";

export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const debug: any = {};

  debug.hasClientId = !!process.env.AMADEUS_CLIENT_ID;
  debug.hasClientSecret = !!process.env.AMADEUS_CLIENT_SECRET;
  debug.clientIdLength = process.env.AMADEUS_CLIENT_ID?.length ?? 0;
  debug.clientSecretLength = process.env.AMADEUS_CLIENT_SECRET?.length ?? 0;
  debug.clientIdEndsWithSpace = process.env.AMADEUS_CLIENT_ID?.endsWith(" ") || process.env.AMADEUS_CLIENT_ID?.endsWith("\n");
  debug.clientSecretEndsWithSpace = process.env.AMADEUS_CLIENT_SECRET?.endsWith(" ") || process.env.AMADEUS_CLIENT_SECRET?.endsWith("\n");

  try {
    const amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID!.trim(),
      clientSecret: process.env.AMADEUS_CLIENT_SECRET!.trim(),
    });

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
    if (response.data?.[0]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      debug.samplePrice = (response.data[0] as any).price?.total;
    }
  } catch (err: unknown) {
    debug.searchSuccess = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const e = err as any;
    debug.errorCode = e?.response?.statusCode ?? e?.code;
    debug.errorMessage = e?.description ?? e?.message;
    debug.errorBody = e?.response?.body;
  }

  return NextResponse.json(debug);
}

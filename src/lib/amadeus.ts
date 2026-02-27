import Amadeus from "amadeus";

let _amadeus: Amadeus | null = null;

function getAmadeus() {
  if (!_amadeus) {
    _amadeus = new Amadeus({
      clientId: process.env.AMADEUS_CLIENT_ID!,
      clientSecret: process.env.AMADEUS_CLIENT_SECRET!,
    });
  }
  return _amadeus;
}

export interface FlightOffer {
  price: number;
  currency: string;
  airline: string;
  departureDate: string;
  returnDate: string;
  outboundSegments: FlightSegment[];
  returnSegments: FlightSegment[];
  bookingLink: string;
}

export interface FlightSegment {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration: string;
}

/**
 * Search for the cheapest flights across a date range.
 * Uses Amadeus Flight Offers Search API.
 * Returns the top N cheapest results across all date combinations.
 */
export async function searchFlights(params: {
  origin: string;
  destination: string;
  departStart: string;
  departEnd: string;
  returnStart: string;
  returnEnd: string;
  adults: number;
  maxResults?: number;
}): Promise<FlightOffer[]> {
  const { origin, destination, adults, maxResults = 5 } = params;

  const departDates = getDateRange(params.departStart, params.departEnd);
  const returnDates = getDateRange(params.returnStart, params.returnEnd);

  // Generate all date combinations (max 5x5 = 25)
  const datePairs: { depart: string; ret: string }[] = [];
  for (const depart of departDates) {
    for (const ret of returnDates) {
      if (ret > depart) {
        datePairs.push({ depart, ret });
      }
    }
  }

  // Search in batches to avoid rate limits
  const allOffers: FlightOffer[] = [];

  for (const { depart, ret } of datePairs) {
    try {
      const response = await getAmadeus().shopping.flightOffersSearch.get({
        originLocationCode: origin,
        destinationLocationCode: destination,
        departureDate: depart,
        returnDate: ret,
        adults: adults.toString(),
        max: "3",
        currencyCode: "USD",
        nonStop: "false",
      });

      const offers = parseFlightOffers(
        response.data,
        response.result?.dictionaries
      );
      allOffers.push(...offers);
    } catch (error) {
      console.error(
        `Amadeus search failed for ${depart} -> ${ret}:`,
        error instanceof Error ? error.message : error
      );
    }

    // Small delay between API calls to respect rate limits
    await delay(200);
  }

  // Sort by price and return top N
  return allOffers
    .sort((a, b) => a.price - b.price)
    .slice(0, maxResults);
}

function parseFlightOffers(
  data: Record<string, unknown>[],
  dictionaries?: Record<string, Record<string, string>>
): FlightOffer[] {
  if (!data || !Array.isArray(data)) return [];

  return data.map((offer: Record<string, unknown>) => {
    const price = offer.price as { total: string; currency: string };
    const itineraries = offer.itineraries as {
      segments: Record<string, unknown>[];
    }[];

    const outbound = itineraries[0]?.segments ?? [];
    const inbound = itineraries[1]?.segments ?? [];

    const carrierCode = (outbound[0] as Record<string, string>)
      ?.carrierCode ?? "";
    const airlineName =
      dictionaries?.carriers?.[carrierCode] ?? carrierCode;

    const outboundSegments = outbound.map(parseSegment);
    const returnSegments = inbound.map(parseSegment);

    const departureDate = outboundSegments[0]?.departure.at.split("T")[0] ?? "";
    const returnDate =
      returnSegments[0]?.departure.at.split("T")[0] ??
      outboundSegments[outboundSegments.length - 1]?.arrival.at.split("T")[0] ??
      "";

    return {
      price: parseFloat(price.total),
      currency: price.currency,
      airline: airlineName,
      departureDate,
      returnDate,
      outboundSegments,
      returnSegments,
      bookingLink: buildGoogleFlightsLink(
        outboundSegments[0]?.departure.iataCode ?? "",
        outboundSegments[outboundSegments.length - 1]?.arrival.iataCode ?? "",
        departureDate,
        returnDate
      ),
    };
  });
}

function parseSegment(seg: Record<string, unknown>): FlightSegment {
  const departure = seg.departure as { iataCode: string; at: string };
  const arrival = seg.arrival as { iataCode: string; at: string };
  return {
    departure: { iataCode: departure.iataCode, at: departure.at },
    arrival: { iataCode: arrival.iataCode, at: arrival.at },
    carrierCode: seg.carrierCode as string,
    number: seg.number as string,
    duration: (seg.duration as string) ?? "",
  };
}

function buildGoogleFlightsLink(
  origin: string,
  destination: string,
  departDate: string,
  returnDate: string
): string {
  return `https://www.google.com/travel/flights?q=Flights+from+${origin}+to+${destination}+on+${departDate}+returning+${returnDate}`;
}

function getDateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  const current = new Date(start);
  const last = new Date(end);

  while (current <= last) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

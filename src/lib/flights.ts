export type LegStatus = "ok" | "no_results" | "error";

export interface LegResult {
  status: LegStatus;
  priceKrw: number | null;
  airline: string | null;
  searchUrl: string;
  errorMessage?: string;
}

export interface LegQuery {
  from: string;
  to: string;
  date: string;
}

interface SerpApiFlight {
  price?: number;
  flights?: { airline?: string }[];
}

interface SerpApiResponse {
  best_flights?: SerpApiFlight[];
  other_flights?: SerpApiFlight[];
  error?: string;
  search_metadata?: {
    status?: string;
    google_flights_url?: string;
  };
}

function legKey(leg: LegQuery): string {
  return `${leg.from}|${leg.to}|${leg.date}`;
}

function buildSerpApiUrl(leg: LegQuery, apiKey: string): string {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google_flights");
  url.searchParams.set("type", "2");
  url.searchParams.set("departure_id", leg.from);
  url.searchParams.set("arrival_id", leg.to);
  url.searchParams.set("outbound_date", leg.date);
  url.searchParams.set("currency", "KRW");
  url.searchParams.set("hl", "ko");
  url.searchParams.set("gl", "kr");
  url.searchParams.set("api_key", apiKey);
  return url.toString();
}

function buildGoogleFlightsUrl(leg: LegQuery): string {
  // Fallback only. Google parses `q=` heuristically and often picks round-trip.
  // We prefer search_metadata.google_flights_url from SerpAPI which is the
  // exact one-way URL SerpAPI used.
  return `https://www.google.com/travel/flights?q=One-way%20flight%20from%20${leg.from}%20to%20${leg.to}%20on%20${leg.date}`;
}

function airlinesOf(flight: SerpApiFlight): string[] {
  return (flight.flights ?? []).map((s) => s.airline).filter((a): a is string => !!a);
}

function pickCheapest(flights: SerpApiFlight[]): SerpApiFlight | null {
  if (flights.length === 0) return null;
  return [...flights].sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))[0];
}

async function searchOneWayRaw(leg: LegQuery): Promise<LegResult> {
  const apiKey = process.env.SERPAPI_KEY?.trim();
  if (!apiKey) {
    return {
      status: "error",
      priceKrw: null,
      airline: null,
      searchUrl: buildGoogleFlightsUrl(leg),
      errorMessage: "SERPAPI_KEY missing",
    };
  }

  try {
    const res = await fetch(buildSerpApiUrl(leg, apiKey));
    const data: SerpApiResponse = await res.json();
    const searchUrl =
      data.search_metadata?.google_flights_url ?? buildGoogleFlightsUrl(leg);

    if (data.error || data.search_metadata?.status === "Error") {
      return {
        status: "error",
        priceKrw: null,
        airline: null,
        searchUrl,
        errorMessage: data.error ?? "SerpAPI error",
      };
    }

    const all = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
    if (all.length === 0) {
      return { status: "no_results", priceKrw: null, airline: null, searchUrl };
    }

    const cheapest = pickCheapest(all);
    if (!cheapest || typeof cheapest.price !== "number") {
      return { status: "no_results", priceKrw: null, airline: null, searchUrl };
    }

    return {
      status: "ok",
      priceKrw: Math.round(cheapest.price),
      airline: airlinesOf(cheapest).join("+") || null,
      searchUrl,
    };
  } catch (e) {
    return {
      status: "error",
      priceKrw: null,
      airline: null,
      searchUrl: buildGoogleFlightsUrl(leg),
      errorMessage: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function searchLegs(legs: LegQuery[]): Promise<{
  results: Map<string, LegResult>;
  apiCallsUsed: number;
}> {
  const unique = new Map<string, LegQuery>();
  for (const leg of legs) unique.set(legKey(leg), leg);

  const entries = await Promise.all(
    [...unique.entries()].map(async ([key, leg]) => {
      const result = await searchOneWayRaw(leg);
      return [key, result] as const;
    })
  );

  return {
    results: new Map(entries),
    apiCallsUsed: unique.size,
  };
}

export function getLegResult(
  results: Map<string, LegResult>,
  leg: LegQuery
): LegResult | undefined {
  return results.get(legKey(leg));
}

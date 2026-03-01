import type { FlightSegment } from "./amadeus";

const USD_TO_KRW = 1450;

/**
 * Format USD price with approximate KRW conversion.
 * e.g. "$131.10 (약 ₩190,000)"
 */
export function formatPriceWithKRW(usdPrice: number): string {
  const usdFormatted = usdPrice.toFixed(2);
  const krwRaw = usdPrice * USD_TO_KRW;
  const krwRounded = Math.round(krwRaw / 1000) * 1000;
  const krwFormatted = krwRounded.toLocaleString("ko-KR");
  return `$${usdFormatted} (약 ₩${krwFormatted})`;
}

/**
 * Calculate journey duration from first departure to last arrival.
 * Returns formatted string like "2시간 30분".
 */
export function formatJourneyDuration(segments: FlightSegment[]): string {
  if (segments.length === 0) return "";

  const departureTime = new Date(segments[0].departure.at).getTime();
  const arrivalTime = new Date(segments[segments.length - 1].arrival.at).getTime();
  const diffMinutes = Math.round((arrivalTime - departureTime) / (1000 * 60));

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

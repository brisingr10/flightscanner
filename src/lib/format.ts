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
 * Parse ISO 8601 duration string (e.g. "PT11H50M") and return total minutes.
 */
function parseISO8601Duration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  return hours * 60 + minutes;
}

/**
 * Sum segment durations from Amadeus ISO 8601 duration fields.
 * Returns formatted string like "11시간 50분".
 */
export function formatJourneyDuration(segments: FlightSegment[]): string {
  if (segments.length === 0) return "";

  const totalMinutes = segments.reduce(
    (sum, seg) => sum + parseISO8601Duration(seg.duration),
    0
  );

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes}분`;
  if (minutes === 0) return `${hours}시간`;
  return `${hours}시간 ${minutes}분`;
}

/**
 * Extract HH:MM time from an ISO datetime string (e.g. "2026-05-29T18:30:00").
 */
export function formatTime(isoDatetime: string): string {
  const timePart = isoDatetime.split("T")[1];
  if (!timePart) return "";
  return timePart.slice(0, 5);
}

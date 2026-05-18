import type { LegQuery } from "./flights";

export interface OptionLegDef extends LegQuery {
  legIndex: number;
  airlinePref?: string;
}

export interface OptionDef {
  id: string;
  name: string;
  expectedPriceKrw: number | null;
  note: string | null;
  legs: OptionLegDef[];
}

export const OPTIONS: OptionDef[] = [
  {
    id: "option-1",
    name: "옵션 1 — 오이타→인천 (제주항공 귀국)",
    expectedPriceKrw: 665_000,
    note: null,
    legs: [
      { legIndex: 0, from: "GMP", to: "HND", date: "2026-11-16", airlinePref: "전일본공수" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "OIT", to: "ICN", date: "2026-11-24", airlinePref: "제주항공" },
    ],
  },
  {
    id: "option-2",
    name: "옵션 2 — 후쿠오카→인천 (아시아나 풀세트)",
    expectedPriceKrw: 661_400,
    note: null,
    legs: [
      { legIndex: 0, from: "ICN", to: "NRT", date: "2026-11-16", airlinePref: "아시아나항공" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "FUK", to: "ICN", date: "2026-11-24", airlinePref: "아시아나항공" },
    ],
  },
  {
    id: "option-3",
    name: "옵션 3 — 오이타→김포 (도쿄 경유, ANA 일관)",
    expectedPriceKrw: 570_000,
    note: "이 가격은 leg별 최저가 합산입니다. 실제 ANA 다구간 패키지(약 ₩570k)는 더 저렴할 수 있어요. 정확한 가격은 Google Flights에서 다구간(Multi-city) 탭으로 직접 확인하세요.",
    legs: [
      { legIndex: 0, from: "GMP", to: "HND", date: "2026-11-16", airlinePref: "전일본공수" },
      { legIndex: 1, from: "HND", to: "OIT", date: "2026-11-19", airlinePref: "전일본공수" },
      { legIndex: 2, from: "OIT", to: "GMP", date: "2026-11-24", airlinePref: "전일본공수" },
    ],
  },
];

export const TRACKER_LIFESPAN_DAYS = 14;

export const ALERT_EMAIL = process.env.ALERT_EMAIL?.trim() ?? "erryiuc10@gmail.com";

export const SERPAPI_MONTHLY_QUOTA = 100;

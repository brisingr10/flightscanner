# SerpAPI 마이그레이션 + 다구간 옵션 모니터링

## Purpose

3개의 고정 routing 옵션(한·일 다구간 항공편)에 대해 매일 최저가 조합을 SerpAPI Google Flights로 조회하고 이메일로 발송한다. 기존 Amadeus 기반 단일 왕복 트래커 시스템을 제거하고 옵션 기반 모니터링 시스템으로 전면 재구성한다.

## Requirements

### 모니터링 대상 옵션 (코드 하드코딩)

**옵션 1 — 오이타→인천 (제주항공)**
- L1: 2026-11-16 GMP→HND
- L3: 2026-11-19 HND→OIT
- L4: 2026-11-24 OIT→ICN (제주항공 11월 직항 아직 미오픈)
- 사용자 추정가: ₩650~680k

**옵션 2 — 후쿠오카→인천 (아시아나)**
- L2: 2026-11-16 ICN→NRT
- L3: 2026-11-19 HND→OIT
- L5: 2026-11-24 FUK→ICN
- 사용자 추정가: ₩661k

**옵션 3 — 오이타→김포 도쿄경유 (ANA)**
- L1: 2026-11-16 GMP→HND
- L3: 2026-11-19 HND→OIT
- L6: 2026-11-24 OIT→GMP (경유)
- 사용자 추정가: ₩570k

→ 고유 leg 6개 (L1·L3 공유)

### 동작 요구사항

- **이메일 발송**: 매일 (변동 없어도 발송), 09:00 KST
- **검색 단위**: 각 leg별 SerpAPI Google Flights one-way 호출 → 최저가 1건 선택 → 옵션별 합산
- **항공사 표기**: SerpAPI가 반환하는 한글명 그대로 ("전일본공수", "제주항공" 등)
- **누락 leg 처리**: 결과 없으면 "예매 미오픈" 표시, 옵션 합산에서 제외 + 옵션 카드에 경고
- **트래커 만료**: 생성 후 14일 (옵션이 코드 정의라 시드 시점부터 14일)
- **가격 변동 표기**: 어제 대비 ± 차이를 이메일에 같이 표시
- **expected_price 표기**: 사용자 추정가와 실측가 차이 표시
- **API 한도 표기**: 이메일 푸터에 "SerpAPI 사용량 X/100" 표시 (한도 임박 시 사용자가 인지)

### 비기능 요구사항

- **SerpAPI 무료 100/월 안에서 운영** — 유료 전환 안 함
- 6 unique legs × 14 days = **84 calls/month** → 한도 16콜 여유
- 호출 실패는 옵션별로 격리 (한 leg 실패해도 다른 옵션은 정상 발송)
- 옵션 3은 leg one-way 합산이라 실제 ANA 다구간 패키지 가격(~₩570k)보다 ₩1.1M 비싸게 표시됨 → **이메일에 명시적 주의 문구 포함** ("이 가격은 leg 합산입니다. 실제 ANA 다구간 패키지는 더 저렴할 수 있어요")

## Success Criteria

1. ✅ Amadeus 관련 코드 전부 제거 (`amadeus.ts`, `types/amadeus.d.ts`, 폼·페이지·라우트)
2. ✅ SerpAPI 기반 `src/lib/flights.ts` 신설, leg 단위 캐싱
3. ✅ 새 스키마 (`option_trackers`, `legs`, `price_snapshots`, `leg_prices`) 마이그레이션 생성·적용
4. ✅ 옵션 3개 시드 스크립트 작성 (`scripts/seed-options.mjs`)
5. ✅ 새 cron route (`/api/cron/check-options`) — 6개 leg dedup → SerpAPI 호출 → snapshot 저장 → 이메일
6. ✅ 새 이메일 템플릿 (`src/emails/options-update.tsx`) — 옵션 카드 + leg별 상세 + 변동 + 한도
7. ✅ 수동 트리거로 첫 이메일 받아 시각 확인
8. ✅ `vercel.json` cron `0 0 * * *` UTC (= 09:00 KST) 유지
9. ✅ 첫 페이지를 옵션 현황 단순 표시로 변경 (트래커 생성 폼 제거)

## Technical Constraints

- **Stack 유지**: Next.js 16 App Router, Neon + Drizzle, Resend + React Email, Tailwind v4
- **언어**: TypeScript, ESM
- **DB**: 신규 테이블 추가, 기존 `trackers`/`flightResults`/`priceHistory`는 마이그레이션으로 drop
- **Cron**: 단일 route, GitHub Actions 다중 배치 불필요 (검색 6개라 30s 안에 충분)
- **이메일 수신자**: 단일 사용자 (erryiuc10@gmail.com — `EMAIL_FROM`/시드 데이터로 관리)
- **인증**: cron route는 `Authorization: Bearer ${CRON_SECRET}` 유지
- **에러**: leg 실패 격리, 옵션별 부분 결과 허용
- **시간대**: 모든 timestamp UTC 저장, 이메일에만 KST로 변환 표시

## Boundaries

### In scope
- Amadeus → SerpAPI 전환
- 다구간 옵션 모델
- 일일 이메일
- 14일 만료
- 옵션 3개 하드코딩

### Out of scope (별도 향후 작업)
- 옵션 추가/수정 UI (코드 수정 + 재배포로 처리)
- 가격 그래프 시각화 (snapshot은 영구 보존하므로 추후 가능)
- 다구간 multi-city 패키지 쿼리 (`type=3`) — 무료 tier 한도 초과 우려로 보류. Option 3은 leg 합산 그대로 두고 이메일에 "실제 패키지는 더 쌀 수 있음" 주의문구만 표시.
- 유료 전환 ($75/월 Developer 플랜) — 무료 안에서 운영. 한도 초과 시 알림만.
- 다중 사용자
- 이메일 수신자 외 추가 알림 채널 (Slack 등)

## 구현 작업 순서

1. **DB 스키마**: `src/lib/db/schema.ts` 재작성. drizzle-kit으로 마이그레이션 생성·푸시.
2. **flights.ts**: SerpAPI 클라이언트, `searchOneWay(from, to, date)` → 최저가 1건. 동일 leg 캐시.
3. **options.ts**: 옵션 3개 정의 (TS 상수).
4. **check-options.ts**: 핵심 로직 — 모든 옵션 leg 수집 → dedup → 호출 → snapshot 저장 → 변동 계산 → 이메일.
5. **이메일 템플릿**: 옵션 카드 컴포넌트 + leg 상세 + 변동 + 한도 푸터.
6. **cron route**: `/api/cron/check-options` 작성. 기존 `check-flights` 라우트 삭제.
7. **옵션 시드 스크립트**: `option_trackers` + `legs` 행 삽입.
8. **UI 정리**: 폼 컴포넌트·트래커 상세/생성 라우트 제거. 첫 페이지를 옵션 현황 표시로 변경.
9. **Amadeus 제거**: `amadeus.ts`, `types/amadeus.d.ts`, `airports.json`, 관련 의존성.
10. **수동 트리거 → 검증**: `node scripts/trigger-cron.mjs` 로컬 호출 → 실제 이메일 수신 확인.
11. **vercel.json**: cron schedule 09:00 KST = `0 0 * * *` UTC로 변경/유지 확인.

## Decisions made (locked)

- Amadeus 제거, SerpAPI 채택 (Duffel/Kiwi 배제)
- **SerpAPI 무료 100/월 안에서 운영** — 유료 전환 없음
- 이메일 매일 발송 (변동 무관) — 사용자 명시 요청
- 만료 14일 — daily × 6 leg × 14일 = 84콜/월, 한도 안전
- Multi-city `type=3` 미도입 — Option 3 ₩1.1M 오차는 이메일 주의문구로 안내
- 옵션 3개 코드 하드코딩 (UI 폼 제거)
- 한국 LCC 11월 미오픈 leg는 "예매 미오픈" 표시 + 옵션에서 격리
- 항공사명 한글 (SerpAPI 기본값)
- 가격 변동 표시 방식: 어제 대비 ±, expected_price 대비, SerpAPI 사용량 X/100

## CEO Review 발견사항 (미해결, 사용자 명시 결정으로 진행)

dual voices(Codex + Claude subagent)가 만장일치로 지적했으나 사용자가 인지 후 유지 결정:

1. **매일 알림 vs 이벤트 트리거** — 두 모델 모두 "매일 = 알림 피로감, 정작 가격 떨어진 날 메일 놓침" 지적. 사용자: 매일 발송 유지.
2. **14일 만료 vs 6개월 여행 horizon** — 두 모델 모두 critical 수준으로 지적 (제주항공 9월 오픈 시점에 트래커 만료되어 있을 위험). 사용자: 무료 tier 제약으로 14일 수용. **재시드 알림 필요** — 이메일 푸터에 "D-N: N일 후 트래커 만료, 재시드 필요" 카운트다운 표시.
3. **Option 3 ₩1.1M 오차** — 두 모델 모두 "알면서 틀린 숫자 발송"이라 지적. 사용자: 이메일 주의문구로 처리.
4. **Google Flights 네이티브 알림 병행** — 사용자가 보조 안전망으로 별도 설정. 이 프로젝트는 통합 뷰·dedup·expected 비교 가치 제공.

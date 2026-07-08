import { getActiveSubscriptionCount } from "@/lib/subscriptions";
import { SubscriptionForm } from "./subscription-form";

export const dynamic = "force-dynamic";

const highlights = [
  {
    title: "출발일 Top 5",
    body: "출발일 범위 안에서 가장 싼 날짜부터 다섯 개만 골라서 보여줍니다.",
  },
  {
    title: "귀국일 Top 5",
    body: "귀국일도 따로 정렬합니다. 왕복 전체를 한눈에 비교하기 좋습니다.",
  },
  {
    title: "14일 자동 추적",
    body: "한 번 등록해 두면 2주 동안 매일 오전 9시에 새 메일이 도착합니다.",
  },
];

const steps = [
  "이메일과 출발지, 도착지를 입력합니다.",
  "출발일 범위와 귀국일 범위를 각각 최대 7일까지 고릅니다.",
  "매일 오전 9시, 날짜별 최저가를 다시 조회해 메일로 보내드립니다.",
];

export default async function Home() {
  const activeCount = await getActiveSubscriptionCount();

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--ink)]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,_rgba(244,140,81,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(53,119,122,0.14),_transparent_28%),linear-gradient(180deg,_rgba(255,250,242,0.98),_rgba(247,243,235,0.72))]" />
      <main className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="font-[family:var(--font-display)] text-2xl tracking-[0.16em] text-[var(--ink-soft)]">
              FlightScanner
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              매일 대신 보고, 진짜 싼 날짜만 골라서 보냅니다.
            </p>
          </div>

          <div className="rounded-full border border-white/70 bg-white/70 px-4 py-2 text-sm shadow-[0_12px_30px_rgba(99,78,53,0.08)] backdrop-blur">
            현재 추적 중인 알림{" "}
            <span className="ml-2 font-semibold text-[var(--accent-deep)]">{activeCount}개</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/88 p-7 shadow-[0_24px_80px_rgba(74,53,27,0.08)] backdrop-blur sm:p-9">
            <div className="max-w-2xl">
              <p className="inline-flex rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-medium tracking-[0.14em] text-[var(--accent-deep)]">
                DAILY FLIGHT WATCH
              </p>
              <h1 className="mt-5 font-[family:var(--font-display)] text-4xl leading-tight text-[var(--ink)] sm:text-5xl">
                날짜 범위만 정하면,
                <br />
                <span className="text-[var(--accent-deep)]">매일 아침</span> 가장 싼 항공권
                후보를 정리해 드립니다.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-8 text-[var(--ink-soft)] sm:text-lg">
                여러 날짜를 일일이 검색할 필요 없습니다. 출발일 범위와 귀국일 범위를
                입력해 두면, 매일 오전 9시에 날짜별 최저가를 다시 확인해서 출발 Top 5,
                귀국 Top 5를 메일로 보내드립니다.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {highlights.map((item) => (
                <article
                  key={item.title}
                  className="rounded-[1.4rem] border border-[rgba(196,181,159,0.42)] bg-[rgba(255,252,248,0.92)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
                >
                  <p className="text-sm font-semibold text-[var(--ink)]">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{item.body}</p>
                </article>
              ))}
            </div>

            <div className="mt-8 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[1.6rem] bg-[linear-gradient(160deg,_rgba(33,88,91,0.96),_rgba(19,51,54,0.98))] p-6 text-white shadow-[0_18px_40px_rgba(20,50,54,0.24)]">
                <p className="text-xs font-medium tracking-[0.16em] text-white/70">
                  이런 분께 맞습니다
                </p>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/88">
                  <li>주말, 연휴, 휴가 일정 중 어느 날짜가 제일 싼지 알고 싶은 경우</li>
                  <li>매일 가격을 확인할 시간은 없지만 타이밍은 놓치고 싶지 않은 경우</li>
                  <li>출발일과 귀국일을 유연하게 잡고 최저가 조합을 보고 싶은 경우</li>
                </ul>
              </div>

              <div className="rounded-[1.6rem] border border-dashed border-[rgba(132,113,92,0.34)] bg-[rgba(247,242,234,0.72)] p-6">
                <p className="text-xs font-medium tracking-[0.16em] text-[var(--ink-muted)]">
                  동작 방식
                </p>
                <ol className="mt-4 space-y-4">
                  {steps.map((step, index) => (
                    <li key={step} className="flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-6 text-[var(--ink-soft)]">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-[rgba(255,255,255,0.78)] bg-[linear-gradient(180deg,_rgba(255,255,255,0.94),_rgba(255,249,240,0.92))] p-6 shadow-[0_24px_80px_rgba(74,53,27,0.1)] sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-medium tracking-[0.16em] text-[var(--ink-muted)]">
                새 알림 만들기
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--ink)]">
                어디서 떠나고, 언제쯤 돌아올지만 알려주세요.
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
                출발지와 도착지는 IATA 3자리 코드로 입력합니다. 예: ICN, GMP, NRT,
                HND, FUK
              </p>
            </div>

            <SubscriptionForm />
          </section>
        </div>
      </main>
    </div>
  );
}

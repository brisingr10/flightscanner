import { TrackerForm } from "@/components/tracker-form";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            FlightScanner
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            최저가 항공권 TOP 5를 하루 1회, 1주일간 이메일로 받아보세요.
            설정만 하면 알아서 추적합니다.
          </p>
        </div>

        <TrackerForm />

        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-2xl mx-auto text-center">
          <div>
            <div className="text-3xl mb-2">1</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              노선 설정
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              출발/도착 공항과 날짜 범위를 선택하세요
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">2</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              가격 모니터링
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              1주일간 하루 1회 (총 7회) 자동 확인
            </p>
          </div>
          <div>
            <div className="text-3xl mb-2">3</div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              최저가 알림
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              가장 저렴한 항공권 5개를 이메일로 전송
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

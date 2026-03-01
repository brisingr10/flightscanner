import { db } from "@/lib/db";
import { trackers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tracker] = await db
    .select()
    .from(trackers)
    .where(eq(trackers.id, id))
    .limit(1);

  if (!tracker) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-zinc-950 dark:to-zinc-900">
      <main className="container mx-auto px-4 py-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <span className="text-2xl">&#10003;</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            추적이 시작되었습니다!
          </h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            항공권 가격을 모니터링하기 시작합니다.
          </p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>
              {tracker.origin} → {tracker.destination}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">이메일</span>
              <span>{tracker.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">출발 날짜</span>
              <span>
                {tracker.departStart} ~ {tracker.departEnd}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">귀국 날짜</span>
              <span>
                {tracker.returnStart} ~ {tracker.returnEnd}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">추적 기간</span>
              <span>1주일 (하루 1회, 총 7회)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">상태</span>
              <span className="text-green-600 font-medium">추적 중</span>
            </div>
            <hr className="my-4" />
            <p className="text-xs text-zinc-400">
              확인 이메일이 발송되었습니다. 첫 번째 가격 업데이트가
              곧 도착합니다. 메일이 보이지 않으면 스팸 폴더를
              확인해주세요.
            </p>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← 다른 항공편 추적하기
          </Link>
        </div>
      </main>
    </div>
  );
}

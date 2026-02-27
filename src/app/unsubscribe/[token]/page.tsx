"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function UnsubscribePage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<"confirm" | "done" | "error">(
    "confirm"
  );
  const [loading, setLoading] = useState(false);

  async function handleUnsubscribe() {
    setLoading(true);
    try {
      const res = await fetch(`/api/unsubscribe/${token}`, {
        method: "POST",
      });
      if (res.ok) {
        setStatus("done");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white dark:from-zinc-950 dark:to-zinc-900 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>
            {status === "confirm" && "구독 해지"}
            {status === "done" && "구독 해지 완료"}
            {status === "error" && "오류가 발생했습니다"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {status === "confirm" && (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                항공권 가격 알림 수신을 중단하시겠습니까?
              </p>
              <Button
                onClick={handleUnsubscribe}
                disabled={loading}
                variant="destructive"
                className="w-full"
              >
                {loading ? "처리 중..." : "네, 구독 해지합니다"}
              </Button>
            </div>
          )}

          {status === "done" && (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                구독이 성공적으로 해지되었습니다. 이 추적에 대한
                가격 알림을 더 이상 받지 않습니다.
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  홈으로 돌아가기
                </Button>
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-zinc-600 dark:text-zinc-400">
                요청을 처리할 수 없습니다. 이미 해지된 추적일 수
                있습니다.
              </p>
              <Link href="/">
                <Button variant="outline" className="w-full">
                  홈으로 돌아가기
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

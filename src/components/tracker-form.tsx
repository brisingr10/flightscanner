"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AirportCombobox } from "./airport-combobox";
import { DateRangePicker } from "./date-range-picker";
import type { DateRange } from "react-day-picker";

export function TrackerForm() {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departRange, setDepartRange] = useState<DateRange | undefined>();
  const [returnRange, setReturnRange] = useState<DateRange | undefined>();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!origin || !destination) {
      setError("출발 공항과 도착 공항을 모두 선택해주세요.");
      return;
    }
    if (!departRange?.from || !departRange?.to) {
      setError("출발 날짜 범위를 선택해주세요.");
      return;
    }
    if (!returnRange?.from || !returnRange?.to) {
      setError("귀국 날짜 범위를 선택해주세요.");
      return;
    }
    if (!email) {
      setError("이메일 주소를 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/trackers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          origin,
          destination,
          departStart: formatDate(departRange.from),
          departEnd: formatDate(departRange.to),
          returnStart: formatDate(returnRange.from),
          returnEnd: formatDate(returnRange.to),
          adults: 1,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "오류가 발생했습니다. 다시 시도해주세요.");
        return;
      }

      router.push(`/tracker/${data.id}`);
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">항공권 가격 추적</CardTitle>
        <p className="text-muted-foreground text-sm">
          하루 2회, 최저가 항공권 TOP 5를 이메일로 받아보세요.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>출발지</Label>
              <AirportCombobox
                value={origin}
                onSelect={setOrigin}
                placeholder="출발 공항 선택..."
                excludeIata={destination}
              />
            </div>
            <div className="space-y-2">
              <Label>도착지</Label>
              <AirportCombobox
                value={destination}
                onSelect={setDestination}
                placeholder="도착 공항 선택..."
                excludeIata={origin}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>출발 날짜</Label>
              <DateRangePicker
                value={departRange}
                onChange={setDepartRange}
                placeholder="출발 날짜 범위 (최대 5일)..."
                minDate={tomorrow}
                maxRangeDays={5}
              />
            </div>
            <div className="space-y-2">
              <Label>귀국 날짜</Label>
              <DateRangePicker
                value={returnRange}
                onChange={setReturnRange}
                placeholder="귀국 날짜 범위 (최대 5일)..."
                minDate={departRange?.from ?? tomorrow}
                maxRangeDays={5}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              이 이메일로 하루 2회 최저가 항공권 정보를 보내드립니다.
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-md">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "추적 설정 중..." : "가격 추적 시작"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

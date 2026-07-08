"use client";

import { useState, useMemo } from "react";
import { AirportAutocomplete } from "@/components/airport-autocomplete";

type FormState = {
  email: string;
  origin: string;
  destination: string;
  departureStart: string;
  departureEnd: string;
  returnStart: string;
  returnEnd: string;
};

const initialState: FormState = {
  email: "",
  origin: "",
  destination: "",
  departureStart: "",
  departureEnd: "",
  returnStart: "",
  returnEnd: "",
};

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function FieldLabel({
  title,
  hint,
  htmlFor,
}: {
  title: string;
  hint?: string;
  htmlFor: string;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-[var(--ink)]">
        {title}
      </label>
      {hint ? <span className="text-xs text-[var(--ink-muted)]">{hint}</span> : null}
    </div>
  );
}

export function SubscriptionForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const today = useMemo(() => todayStr(), []);

  const departureEndMin = form.departureStart || undefined;
  const departureEndMax = form.departureStart
    ? addDays(form.departureStart, 6)
    : undefined;

  const returnStartMin = form.departureStart
    ? form.departureStart > today
      ? form.departureStart
      : today
    : undefined;

  const returnEndMin = form.returnStart
    ? form.departureEnd && form.departureEnd > form.returnStart
      ? form.departureEnd
      : form.returnStart
    : undefined;
  const returnEndMax = form.returnStart
    ? addDays(form.returnStart, 6)
    : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/subscriptions", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "알림 등록에 실패했습니다.");
      }

      setSuccess(
        payload.initialEmailSent
          ? `${payload.subscription.email}로 첫 메일을 보냈습니다. ${new Date(
              payload.subscription.expiresAt
            )
              .toISOString()
              .slice(0, 10)}까지 매일 아침 9시에 보내드릴게요.`
          : `${payload.subscription.email}로 알림을 등록했습니다.`
      );
      setForm(initialState);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : "알림 등록에 실패했습니다."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <div className="rounded-[1.4rem] border border-[rgba(206,193,175,0.75)] bg-white/80 p-4">
        <FieldLabel title="받는 이메일" htmlFor="email" />
        <input
          id="email"
          type="email"
          required
          value={form.email}
          onChange={(event) => updateField("email", event.target.value)}
          className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
          placeholder="you@example.com"
        />
      </div>

      <hr className="border-t border-[rgba(206,193,175,0.3)]" />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.4rem] border border-[rgba(206,193,175,0.75)] bg-white/80 p-4">
          <FieldLabel title="출발지" hint="IATA 3자리" htmlFor="origin" />
          <AirportAutocomplete
            id="origin"
            value={form.origin}
            onChange={(code) => updateField("origin", code)}
            placeholder="ICN"
          />
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(206,193,175,0.75)] bg-white/80 p-4">
          <FieldLabel title="도착지" hint="IATA 3자리" htmlFor="destination" />
          <AirportAutocomplete
            id="destination"
            value={form.destination}
            onChange={(code) => updateField("destination", code)}
            placeholder="NRT"
          />
        </div>
      </div>

      <hr className="border-t border-[rgba(206,193,175,0.3)]" />

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[1.6rem] border border-[rgba(206,193,175,0.75)] bg-[rgba(255,252,247,0.9)] p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[var(--ink)]">출발일 범위</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              최대 7일, Top 5 추천
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel title="시작일" htmlFor="departureStart" />
              <input
                id="departureStart"
                type="date"
                required
                min={today}
                value={form.departureStart}
                onChange={(event) => {
                  updateField("departureStart", event.target.value);
                  // Clear departureEnd if it falls outside the new range
                  if (form.departureEnd && event.target.value) {
                    const max = addDays(event.target.value, 6);
                    if (form.departureEnd > max) {
                      updateField("departureEnd", "");
                    }
                  }
                  // Clear returnStart if it's now before departureStart
                  if (form.returnStart && event.target.value && form.returnStart < event.target.value) {
                    updateField("returnStart", "");
                    updateField("returnEnd", "");
                  }
                }}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-5 py-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
              />
            </div>
            <div>
              <FieldLabel title="종료일" htmlFor="departureEnd" />
              <input
                id="departureEnd"
                type="date"
                required
                disabled={!form.departureStart}
                min={departureEndMin}
                max={departureEndMax}
                value={form.departureEnd}
                onChange={(event) => {
                  updateField("departureEnd", event.target.value);
                  // Clear returnEnd if it's now before departureEnd
                  if (form.returnEnd && event.target.value && form.returnEnd < event.target.value) {
                    updateField("returnEnd", "");
                  }
                }}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-5 py-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-[rgba(206,193,175,0.75)] bg-[rgba(247,251,251,0.92)] p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[var(--ink)]">귀국일 범위</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              귀국일도 별도 정렬
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <FieldLabel title="시작일" htmlFor="returnStart" />
              <input
                id="returnStart"
                type="date"
                required
                disabled={!form.departureStart}
                min={returnStartMin}
                value={form.returnStart}
                onChange={(event) => {
                  updateField("returnStart", event.target.value);
                  if (form.returnEnd && event.target.value) {
                    const max = addDays(event.target.value, 6);
                    if (form.returnEnd > max) {
                      updateField("returnEnd", "");
                    }
                  }
                }}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-5 py-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
            <div>
              <FieldLabel title="종료일" htmlFor="returnEnd" />
              <input
                id="returnEnd"
                type="date"
                required
                disabled={!form.departureEnd || !form.returnStart}
                min={returnEndMin}
                max={returnEndMax}
                value={form.returnEnd}
                onChange={(event) => updateField("returnEnd", event.target.value)}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-5 py-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)] disabled:cursor-not-allowed disabled:opacity-40"
              />
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <div className="flex gap-3 rounded-2xl border border-[rgba(210,96,84,0.24)] bg-[rgba(255,239,236,0.94)] px-4 py-3.5 text-sm leading-6 text-[rgb(148,47,32)]">
          <span className="mt-0.5 shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex gap-3 rounded-2xl border border-[rgba(43,128,109,0.22)] bg-[rgba(236,250,245,0.96)] px-4 py-3.5 text-sm leading-6 text-[rgb(28,99,83)]">
          <span className="mt-0.5 shrink-0">✅</span>
          <span>{success}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--ink-muted)]">
          7일간 매일 오전 9시 발송
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-w-[13rem] items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,_var(--accent),_var(--accent-deep))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(196,95,38,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(196,95,38,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <>
              <span className="inline-block h-4 w-4 animate-[spin_0.8s_linear_infinite] rounded-full border-2 border-white/30 border-t-white" />
              등록 중...
            </>
          ) : (
            "매일 받아보기"
          )}
        </button>
      </div>
    </form>
  );
}
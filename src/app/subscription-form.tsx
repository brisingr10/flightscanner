"use client";

import { useState } from "react";

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
          ? `${payload.subscription.email}로 첫 메일을 바로 보냈습니다. ${new Date(
              payload.subscription.expiresAt
            )
              .toISOString()
              .slice(0, 10)}까지 매일 오전 9시에 계속 보내드릴게요.`
          : `${payload.subscription.email}로 알림을 등록했습니다. 첫 메일 전송은 완료되지 않았지만 ${new Date(
              payload.subscription.expiresAt
            )
              .toISOString()
              .slice(0, 10)}까지 매일 오전 9시에 계속 시도합니다.`
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
          className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
          placeholder="you@example.com"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[1.4rem] border border-[rgba(206,193,175,0.75)] bg-white/80 p-4">
          <FieldLabel title="출발지" hint="IATA 3자리" htmlFor="origin" />
          <input
            id="origin"
            type="text"
            required
            maxLength={3}
            value={form.origin}
            onChange={(event) => updateField("origin", event.target.value.toUpperCase())}
            className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm uppercase text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
            placeholder="ICN"
          />
        </div>

        <div className="rounded-[1.4rem] border border-[rgba(206,193,175,0.75)] bg-white/80 p-4">
          <FieldLabel title="도착지" hint="IATA 3자리" htmlFor="destination" />
          <input
            id="destination"
            type="text"
            required
            maxLength={3}
            value={form.destination}
            onChange={(event) =>
              updateField("destination", event.target.value.toUpperCase())
            }
            className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm uppercase text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
            placeholder="NRT"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-[1.6rem] border border-[rgba(206,193,175,0.75)] bg-[rgba(255,252,247,0.9)] p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[var(--ink)]">출발일 범위</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              최대 7일까지 선택할 수 있습니다. 가장 싼 출발일 Top 5를 보내드립니다.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <FieldLabel title="시작일" htmlFor="departureStart" />
              <input
                id="departureStart"
                type="date"
                required
                value={form.departureStart}
                onChange={(event) => updateField("departureStart", event.target.value)}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
              />
            </div>

            <div>
              <FieldLabel title="종료일" htmlFor="departureEnd" />
              <input
                id="departureEnd"
                type="date"
                required
                value={form.departureEnd}
                onChange={(event) => updateField("departureEnd", event.target.value)}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
              />
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-[rgba(206,193,175,0.75)] bg-[rgba(247,251,251,0.92)] p-4">
          <div className="mb-4">
            <p className="text-sm font-semibold text-[var(--ink)]">귀국일 범위</p>
            <p className="mt-1 text-xs leading-5 text-[var(--ink-muted)]">
              귀국일도 따로 정렬합니다. 돌아오는 날짜를 넓게 볼 때 유용합니다.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <FieldLabel title="시작일" htmlFor="returnStart" />
              <input
                id="returnStart"
                type="date"
                required
                value={form.returnStart}
                onChange={(event) => updateField("returnStart", event.target.value)}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
              />
            </div>

            <div>
              <FieldLabel title="종료일" htmlFor="returnEnd" />
              <input
                id="returnEnd"
                type="date"
                required
                value={form.returnEnd}
                onChange={(event) => updateField("returnEnd", event.target.value)}
                className="w-full rounded-2xl border border-[rgba(184,168,146,0.58)] bg-white px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:ring-4 focus:ring-[rgba(230,123,62,0.12)]"
              />
            </div>
          </div>
        </section>
      </div>

      {error ? (
        <p className="rounded-2xl border border-[rgba(210,96,84,0.24)] bg-[rgba(255,239,236,0.94)] px-4 py-3 text-sm leading-6 text-[rgb(148,47,32)]">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="rounded-2xl border border-[rgba(43,128,109,0.22)] bg-[rgba(236,250,245,0.96)] px-4 py-3 text-sm leading-6 text-[rgb(28,99,83)]">
          {success}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-[var(--ink-muted)]">
          등록 후 14일 동안 매일 오전 9시에 메일이 발송됩니다.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-w-[13rem] items-center justify-center rounded-full bg-[linear-gradient(135deg,_var(--accent),_var(--accent-deep))] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_35px_rgba(196,95,38,0.24)] transition hover:translate-y-[-1px] hover:shadow-[0_22px_40px_rgba(196,95,38,0.28)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "등록하는 중..." : "이 일정으로 매일 받아보기"}
        </button>
      </div>
    </form>
  );
}

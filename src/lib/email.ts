import { Resend } from "resend";
import { OptionsUpdateEmail } from "@/emails/options-update";
import type { OptionOutput } from "./check-options";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const EMAIL_FROM = process.env.EMAIL_FROM ?? "FlightScanner <onboarding@resend.dev>";

function formatKstNow(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  const hh = String(kst.getUTCHours()).padStart(2, "0");
  const mm = String(kst.getUTCMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm} KST`;
}

function buildSubject(options: OptionOutput[]): string {
  const cheapest = options
    .filter((o) => o.totalPriceKrw !== null)
    .sort((a, b) => (a.totalPriceKrw ?? 0) - (b.totalPriceKrw ?? 0))[0];

  if (!cheapest || cheapest.totalPriceKrw === null) {
    return "오늘의 항공권 옵션 — 일부 leg 미오픈";
  }

  const priceStr = "₩" + cheapest.totalPriceKrw.toLocaleString("ko-KR");
  const drops = options.filter(
    (o) => o.diffVsYesterday !== null && o.diffVsYesterday < -10_000
  );
  if (drops.length > 0) {
    return `📉 가격 하락! 최저 ${priceStr}부터`;
  }
  return `오늘의 항공권 옵션 — 최저 ${priceStr}부터`;
}

export async function sendOptionsUpdate(params: {
  to: string;
  options: OptionOutput[];
  apiCallsThisMonth: number;
  monthlyQuota: number;
}): Promise<void> {
  const { to, options, apiCallsThisMonth, monthlyQuota } = params;
  const recipients = to
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: recipients,
    subject: buildSubject(options),
    react: OptionsUpdateEmail({
      options,
      apiCallsThisMonth,
      monthlyQuota,
      checkedAtKst: formatKstNow(),
    }),
  });

  if (error) {
    console.error("Failed to send options update email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

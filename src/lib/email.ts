import { Resend } from "resend";
import { FlightResultsEmail } from "@/emails/flight-results";
import type { FlightOffer } from "./amadeus";

let _resend: Resend | null = null;

function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const EMAIL_FROM = "FlightScanner <onboarding@resend.dev>";

export async function sendFlightResults(params: {
  to: string;
  origin: string;
  destination: string;
  flights: FlightOffer[];
  previousLowest: number | null;
  unsubscribeToken: string;
}) {
  const { to, origin, destination, flights, previousLowest, unsubscribeToken } =
    params;

  const currentLowest = flights[0]?.price ?? 0;
  const priceDropPercent =
    previousLowest && currentLowest < previousLowest
      ? Math.round(((previousLowest - currentLowest) / previousLowest) * 100)
      : null;

  const subject = priceDropPercent
    ? `${priceDropPercent}% 가격 하락! ${origin} → ${destination} $${currentLowest}부터`
    : `항공권 업데이트: ${origin} → ${destination} $${currentLowest}부터`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    react: FlightResultsEmail({
      origin,
      destination,
      flights,
      previousLowest,
      unsubscribeUrl: `${appUrl}/unsubscribe/${unsubscribeToken}`,
    }),
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

export async function sendConfirmationEmail(params: {
  to: string;
  origin: string;
  destination: string;
  departRange: string;
  returnRange: string;
  unsubscribeToken: string;
}) {
  const { to, origin, destination, departRange, returnRange, unsubscribeToken } =
    params;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to,
    subject: `추적 시작: ${origin} → ${destination}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>항공권 추적이 시작되었습니다</h2>
        <p>다음 조건의 최저가 항공권 TOP 5를 이메일로 보내드립니다:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666;">노선</td><td style="padding: 8px; font-weight: bold;">${origin} → ${destination}</td></tr>
          <tr><td style="padding: 8px; color: #666;">출발 날짜</td><td style="padding: 8px;">${departRange}</td></tr>
          <tr><td style="padding: 8px; color: #666;">귀국 날짜</td><td style="padding: 8px;">${returnRange}</td></tr>
          <tr><td style="padding: 8px; color: #666;">확인 주기</td><td style="padding: 8px;">하루 2회</td></tr>
        </table>
        <p>첫 번째 가격 업데이트는 12시간 이내에 도착합니다.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          <a href="${appUrl}/unsubscribe/${unsubscribeToken}" style="color: #999;">구독 해지</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Failed to send confirmation email:", error);
    throw new Error(`Confirmation email failed: ${error.message}`);
  }
}

import { Resend } from "resend";
import { OptionsUpdateEmail } from "@/emails/options-update";
import { SubscriptionDigestEmail } from "@/emails/subscription-digest";
import type { OptionOutput } from "./check-options";
import type { SubscriptionDigest } from "./subscriptions";

let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
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

function buildOptionsSubject(options: OptionOutput[]): string {
  const cheapest = options
    .filter((option) => option.totalPriceKrw !== null)
    .sort((a, b) => (a.totalPriceKrw ?? 0) - (b.totalPriceKrw ?? 0))[0];

  if (!cheapest?.totalPriceKrw) {
    return "[FlightScanner] Daily options update";
  }

  return `[FlightScanner] Cheapest tracked option KRW ${cheapest.totalPriceKrw.toLocaleString(
    "ko-KR"
  )}`;
}

export async function sendOptionsUpdate(params: {
  to: string;
  options: OptionOutput[];
}): Promise<void> {
  const { to, options } = params;
  const recipients = to
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: recipients,
    subject: buildOptionsSubject(options),
    react: OptionsUpdateEmail({
      options,
      checkedAtKst: formatKstNow(),
    }),
  });

  if (error) {
    console.error("Failed to send options update email:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

function buildDigestSubject(digest: SubscriptionDigest): string {
  const bestOutbound = digest.outbound.topOptions.find(
    (option) => option.result.status === "ok" && option.result.priceKrw !== null
  );
  const bestInbound = digest.inbound.topOptions.find(
    (option) => option.result.status === "ok" && option.result.priceKrw !== null
  );

  const route = `${digest.subscription.originIata}-${digest.subscription.destinationIata}`;
  if (!bestOutbound && !bestInbound) {
    return `[FlightScanner] ${route} daily update`;
  }

  const parts: string[] = [];
  if (bestOutbound?.result.priceKrw) {
    parts.push(`out ${bestOutbound.result.priceKrw.toLocaleString("ko-KR")}`);
  }
  if (bestInbound?.result.priceKrw) {
    parts.push(`return ${bestInbound.result.priceKrw.toLocaleString("ko-KR")}`);
  }

  return `[FlightScanner] ${route} ${parts.join(" / ")}`;
}

export async function sendSubscriptionDigest(params: {
  to: string;
  digest: SubscriptionDigest;
}): Promise<void> {
  const { to, digest } = params;

  const { error } = await getResend().emails.send({
    from: EMAIL_FROM,
    to: [to],
    subject: buildDigestSubject(digest),
    react: SubscriptionDigestEmail({
      digest,
      checkedAtKst: formatKstNow(),
    }),
  });

  if (error) {
    console.error("Failed to send subscription digest:", error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

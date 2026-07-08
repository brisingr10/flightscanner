import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Section,
  Text,
} from "@react-email/components";
import type { RankedRangeSummary, SubscriptionDigest } from "@/lib/subscriptions";

interface SubscriptionDigestEmailProps {
  digest: SubscriptionDigest;
  apiCallsThisMonth: number;
  monthlyQuota: number;
  checkedAtKst: string;
}

function fmtDate(value: Date | string | null): string {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, "0");
  const d = String(value.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fmtKrw(value: number | null): string {
  if (value === null) return "Price unavailable";
  return `KRW ${value.toLocaleString("ko-KR")}`;
}

function renderRange(label: string, range: RankedRangeSummary) {
  if (range.topOptions.length === 0) {
    return (
      <Section style={card}>
        <Text style={sectionTitle}>{label}</Text>
        <Text style={muted}>No dates were available in this range.</Text>
      </Section>
    );
  }

  return (
    <Section style={card}>
      <Text style={sectionTitle}>{label}</Text>
      <Text style={subtle}>
        {range.successfulCount > 0
          ? `${range.successfulCount} of ${range.totalDates} dates returned prices today.`
          : `No priced itineraries were returned today. Showing the first ${range.topOptions.length} dates checked.`}
      </Text>

      {range.topOptions.map((option, index) => (
        <Section key={`${label}-${option.date}`} style={optionRow}>
          <Text style={optionRank}>#{index + 1}</Text>
          <Text style={optionBody}>
            <strong>{option.date}</strong>
            {" - "}
            {fmtKrw(option.result.priceKrw)}
            {" - "}
            {option.result.airline ?? option.result.status}
            {" - "}
            <Link href={option.result.searchUrl} style={linkStyle}>
              Open Google Flights
            </Link>
          </Text>
        </Section>
      ))}
    </Section>
  );
}

export function SubscriptionDigestEmail({
  digest,
  apiCallsThisMonth,
  monthlyQuota,
  checkedAtKst,
}: SubscriptionDigestEmailProps) {
  const { subscription } = digest;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={title}>FlightScanner Daily Alert</Text>
          <Text style={subtitle}>{checkedAtKst}</Text>

          <Section style={hero}>
            <Text style={heroLine}>
              Route: {subscription.originIata} to {subscription.destinationIata}
            </Text>
            <Text style={heroLine}>
              Departure window: {fmtDate(subscription.departureStart)} to {fmtDate(subscription.departureEnd)}
            </Text>
            <Text style={heroLine}>
              Return window: {fmtDate(subscription.returnStart)} to {fmtDate(subscription.returnEnd)}
            </Text>
            <Text style={heroLine}>Subscription ends in {digest.daysRemaining} day(s).</Text>
          </Section>

          {renderRange(
            `Top 5 outbound dates (${subscription.originIata} -> ${subscription.destinationIata})`,
            digest.outbound
          )}

          {renderRange(
            `Top 5 return dates (${subscription.destinationIata} -> ${subscription.originIata})`,
            digest.inbound
          )}

          <Hr style={hr} />

          <Text style={footerText}>
            SerpAPI usage this month: {apiCallsThisMonth} / {monthlyQuota}
          </Text>
          <Text style={footerText}>
            Rankings are based on the cheapest fare found for each individual date in your selected range.
          </Text>
          <Text style={footerText}>
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL ?? "https://flightscanner.vercel.app"}/api/subscriptions/${digest.subscription.id}/unsubscribe`}
              style={linkStyle}
            >
              구독 취소하기
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f5f7fb",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  margin: "0",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  maxWidth: "640px",
  padding: "24px",
};

const title = {
  color: "#111827",
  fontSize: "24px",
  fontWeight: "700",
  margin: "0 0 4px",
};

const subtitle = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 20px",
};

const hero = {
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "18px",
};

const heroLine = {
  color: "#111827",
  fontSize: "14px",
  margin: "4px 0",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "16px",
};

const sectionTitle = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const subtle = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 12px",
};

const muted = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0",
};

const optionRow = {
  marginBottom: "8px",
};

const optionRank = {
  color: "#2563eb",
  fontSize: "12px",
  fontWeight: "700",
  margin: "0 0 2px",
};

const optionBody = {
  color: "#111827",
  fontSize: "13px",
  margin: "0",
  lineHeight: "1.5",
};

const linkStyle = {
  color: "#2563eb",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0 16px",
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "4px 0",
};

import {
  Body,
  Container,
  Head,
  Html,
  Section,
  Text,
} from "@react-email/components";
import type { OptionOutput } from "@/lib/check-options";

interface OptionsUpdateEmailProps {
  options: OptionOutput[];
  apiCallsThisMonth: number;
  monthlyQuota: number;
  checkedAtKst: string;
}

function fmtKrw(value: number | null): string {
  if (value === null) return "Unavailable";
  return `KRW ${value.toLocaleString("ko-KR")}`;
}

export function OptionsUpdateEmail({
  options,
  apiCallsThisMonth,
  monthlyQuota,
  checkedAtKst,
}: OptionsUpdateEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={title}>FlightScanner Options Update</Text>
          <Text style={subtitle}>{checkedAtKst}</Text>

          {options.map((option) => (
            <Section key={option.trackerId} style={card}>
              <Text style={cardTitle}>{option.name}</Text>
              <Text style={line}>
                Total price:{" "}
                {option.isComplete ? fmtKrw(option.totalPriceKrw) : "Partial result"}
              </Text>
              <Text style={line}>
                Expected price: {fmtKrw(option.expectedPriceKrw)}
              </Text>
              <Text style={line}>Days remaining: {option.daysUntilExpiry}</Text>
            </Section>
          ))}

          <Text style={footer}>
            SerpAPI usage this month: {apiCallsThisMonth} / {monthlyQuota}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f5f7fb",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
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
  margin: "0 0 16px",
};

const card = {
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
  padding: "16px",
  marginBottom: "12px",
};

const cardTitle = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px",
};

const line = {
  color: "#374151",
  fontSize: "13px",
  margin: "4px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "16px 0 0",
};

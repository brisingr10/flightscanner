import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Row,
  Column,
} from "@react-email/components";
import type { FlightOffer } from "@/lib/amadeus";
import { formatPriceWithKRW, formatJourneyDuration, formatTime } from "@/lib/format";

interface FlightResultsEmailProps {
  origin: string;
  destination: string;
  flights: FlightOffer[];
  previousLowest: number | null;
  unsubscribeUrl: string;
}

export function FlightResultsEmail({
  origin,
  destination,
  flights,
  previousLowest,
  unsubscribeUrl,
}: FlightResultsEmailProps) {
  const currentLowest = flights[0]?.price ?? 0;
  const priceDropped = previousLowest !== null && currentLowest < previousLowest;
  const priceDropPercent = priceDropped
    ? Math.round(((previousLowest - currentLowest) / previousLowest) * 100)
    : 0;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Text style={heading}>
            {origin} → {destination}
          </Text>

          {priceDropped && (
            <Section style={priceDropBanner}>
              <Text style={priceDropText}>
                가격 {priceDropPercent}% 하락!{" "}
                {formatPriceWithKRW(previousLowest)} →{" "}
                {formatPriceWithKRW(currentLowest)}
              </Text>
            </Section>
          )}

          <Text style={subheading}>최저가 항공권 TOP 5</Text>

          {flights.map((flight, i) => (
            <Section key={i} style={flightCard}>
              <Row>
                <Column style={rankCol}>
                  <Text style={rank}>#{i + 1}</Text>
                </Column>
                <Column style={detailsCol}>
                  <Text style={price}>
                    {formatPriceWithKRW(flight.price)}
                  </Text>
                  <Text style={airline}>{flight.airline}</Text>
                  <Text style={dates}>
                    출발: {flight.departureDate}{" "}
                    {formatTime(flight.outboundSegments[0]?.departure.at ?? "")}
                    {" · "}귀국: {flight.returnDate}{" "}
                    {formatTime(flight.returnSegments[0]?.departure.at ?? "")}
                  </Text>
                  <Text style={stops}>
                    {flight.outboundSegments.length === 1
                      ? "직항"
                      : `경유 ${flight.outboundSegments.length - 1}회`}{" "}
                    (가는편) ·{" "}
                    {flight.returnSegments.length === 1
                      ? "직항"
                      : `경유 ${flight.returnSegments.length - 1}회`}{" "}
                    (오는편)
                  </Text>
                  <Text style={duration}>
                    가는편 {formatJourneyDuration(flight.outboundSegments)}
                    {flight.returnSegments.length > 0 &&
                      ` · 오는편 ${formatJourneyDuration(flight.returnSegments)}`}
                  </Text>
                </Column>
                <Column style={actionCol}>
                  <Link href={flight.bookingLink} style={bookLink}>
                    보기 →
                  </Link>
                </Column>
              </Row>
            </Section>
          ))}

          <Hr style={hr} />
          <Text style={footer}>
            항공권 가격 추적을 설정하셨기 때문에 이 메일을 받고 계십니다.{" "}
            <Link href={unsubscribeUrl} style={unsubLink}>
              구독 해지
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "600px",
};

const heading = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "0 0 8px",
};

const subheading = {
  fontSize: "16px",
  fontWeight: "600" as const,
  color: "#444",
  margin: "16px 0 12px",
};

const priceDropBanner = {
  backgroundColor: "#ecfdf5",
  border: "1px solid #a7f3d0",
  borderRadius: "8px",
  padding: "12px 16px",
  margin: "12px 0",
};

const priceDropText = {
  color: "#065f46",
  fontSize: "14px",
  fontWeight: "600" as const,
  margin: "0",
};

const flightCard = {
  border: "1px solid #e5e7eb",
  borderRadius: "8px",
  padding: "12px",
  marginBottom: "8px",
};

const rankCol = { width: "40px", verticalAlign: "top" as const };
const detailsCol = { verticalAlign: "top" as const };
const actionCol = { width: "60px", verticalAlign: "middle" as const, textAlign: "right" as const };

const rank = {
  fontSize: "14px",
  fontWeight: "bold" as const,
  color: "#9ca3af",
  margin: "0",
};

const price = {
  fontSize: "18px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  margin: "0 0 2px",
};

const airline = {
  fontSize: "14px",
  color: "#4b5563",
  margin: "0 0 2px",
};

const dates = {
  fontSize: "13px",
  color: "#6b7280",
  margin: "0 0 2px",
};

const stops = {
  fontSize: "12px",
  color: "#9ca3af",
  margin: "0 0 2px",
};

const duration = {
  fontSize: "12px",
  color: "#6b7280",
  margin: "0",
};

const bookLink = {
  color: "#2563eb",
  fontSize: "13px",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const footer = {
  color: "#9ca3af",
  fontSize: "12px",
};

const unsubLink = {
  color: "#9ca3af",
};

export default FlightResultsEmail;

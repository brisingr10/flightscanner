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
import type { OptionOutput } from "@/lib/check-options";

interface OptionsUpdateEmailProps {
  options: OptionOutput[];
  apiCallsThisMonth: number;
  monthlyQuota: number;
  checkedAtKst: string;
}

function fmtKrw(n: number | null): string {
  if (n === null) return "—";
  return "₩" + n.toLocaleString("ko-KR");
}

function fmtDiff(n: number | null): string {
  if (n === null) return "";
  if (n === 0) return " (어제와 동일)";
  const sign = n > 0 ? "+" : "";
  return ` (어제 대비 ${sign}${n.toLocaleString("ko-KR")}원)`;
}

function statusLabel(status: string): string {
  if (status === "ok") return "";
  if (status === "no_results") return "예매 미오픈";
  return "조회 실패";
}

function fmtMonthDay(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${m}-${day}`;
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
          <Text style={h1}>오늘의 항공권 옵션</Text>
          <Text style={subtitle}>{checkedAtKst} 기준</Text>

          {options.map((opt) => {
            const expectedDelta =
              opt.totalPriceKrw !== null && opt.expectedPriceKrw !== null
                ? opt.totalPriceKrw - opt.expectedPriceKrw
                : null;

            return (
              <Section key={opt.trackerId} style={card}>
                <Text style={cardTitle}>{opt.name}</Text>

                <Text style={priceLine}>
                  {opt.isComplete ? fmtKrw(opt.totalPriceKrw) : "일부 leg 미오픈"}
                  <span style={diffStyle}>{fmtDiff(opt.diffVsYesterday)}</span>
                </Text>

                {opt.expectedPriceKrw !== null && opt.totalPriceKrw !== null && (
                  <Text style={expectedLine}>
                    예상가 {fmtKrw(opt.expectedPriceKrw)} 대비{" "}
                    {expectedDelta !== null && expectedDelta < 0 ? "" : "+"}
                    {expectedDelta?.toLocaleString("ko-KR")}원
                  </Text>
                )}

                {opt.legs.map((leg) => (
                  <Text key={leg.legIndex} style={legLine}>
                    <strong>{leg.from} → {leg.to}</strong> {leg.date}
                    {" · "}
                    {leg.result.status === "ok" ? (
                      <>
                        {fmtKrw(leg.result.priceKrw)}{" "}
                        <span style={airlineStyle}>
                          ({leg.result.airline ?? "-"})
                        </span>
                        {" · "}
                        <Link href={leg.result.searchUrl} style={linkStyle}>
                          Google Flights
                        </Link>
                      </>
                    ) : (
                      <span style={warnStyle}>
                        {statusLabel(leg.result.status)}{" · "}
                        <Link href={leg.result.searchUrl} style={linkStyle}>
                          Google Flights에서 확인
                        </Link>
                      </span>
                    )}
                  </Text>
                ))}

                {opt.note && <Text style={noteStyle}>⚠ {opt.note}</Text>}

                {opt.history.length > 1 && (
                  <>
                    <Text style={historyHeader}>가격 추이 (최근 {opt.history.length}회)</Text>
                    {opt.history.map((point, i) => {
                      const prev = opt.history[i + 1];
                      const diff =
                        prev && point.totalPriceKrw !== null && prev.totalPriceKrw !== null
                          ? point.totalPriceKrw - prev.totalPriceKrw
                          : null;
                      const diffStr =
                        diff === null
                          ? ""
                          : diff === 0
                          ? " (-)"
                          : ` (${diff > 0 ? "+" : ""}${diff.toLocaleString("ko-KR")})`;
                      return (
                        <Text key={i} style={historyLine}>
                          <span style={historyDate}>{fmtMonthDay(point.checkedAt)}</span>{" "}
                          {fmtKrw(point.totalPriceKrw)}
                          {!point.isComplete && (
                            <span style={historyIncomplete}> (일부 미오픈)</span>
                          )}
                          <span style={historyDiff}>{diffStr}</span>
                        </Text>
                      );
                    })}
                  </>
                )}

                <Text style={footerInfo}>
                  D-{opt.daysUntilExpiry}: 트래커 만료까지 {opt.daysUntilExpiry}일
                  {opt.daysUntilExpiry <= 3 && " — 곧 재시드 필요"}
                </Text>
              </Section>
            );
          })}

          <Hr style={hr} />

          <Text style={quotaLine}>
            SerpAPI 사용량: {apiCallsThisMonth} / {monthlyQuota}
            {apiCallsThisMonth >= monthlyQuota * 0.9 && " ⚠ 한도 임박"}
          </Text>

          <Text style={footerNote}>
            이 가격들은 leg별 최저가 합산입니다. 항공사 다구간 패키지 fare는 별도로
            Google Flights 다구간(Multi-city) 탭에서 확인하세요.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "24px",
  maxWidth: "600px",
};

const h1 = {
  fontSize: "22px",
  fontWeight: "700",
  color: "#111",
  margin: "0 0 4px",
};

const subtitle = {
  fontSize: "13px",
  color: "#888",
  margin: "0 0 20px",
};

const card = {
  border: "1px solid #e6e6e6",
  borderRadius: "8px",
  padding: "16px",
  marginBottom: "16px",
};

const cardTitle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#222",
  margin: "0 0 8px",
};

const priceLine = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#0a7",
  margin: "0 0 4px",
};

const diffStyle = {
  fontSize: "13px",
  fontWeight: "400",
  color: "#666",
};

const expectedLine = {
  fontSize: "12px",
  color: "#888",
  margin: "0 0 12px",
};

const legLine = {
  fontSize: "13px",
  color: "#333",
  margin: "6px 0",
};

const airlineStyle = {
  color: "#666",
};

const warnStyle = {
  color: "#c80",
};

const linkStyle = {
  color: "#06c",
  textDecoration: "underline",
};

const noteStyle = {
  fontSize: "12px",
  color: "#a60",
  backgroundColor: "#fffbe6",
  padding: "8px",
  borderRadius: "4px",
  margin: "12px 0 8px",
};

const historyHeader = {
  fontSize: "11px",
  fontWeight: "600",
  color: "#555",
  margin: "12px 0 4px",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
};

const historyLine = {
  fontSize: "12px",
  color: "#444",
  margin: "2px 0",
  fontFamily: "ui-monospace, Menlo, Consolas, monospace",
};

const historyDate = {
  color: "#888",
  marginRight: "8px",
};

const historyDiff = {
  color: "#888",
  fontSize: "11px",
};

const historyIncomplete = {
  color: "#c80",
  fontSize: "11px",
};

const footerInfo = {
  fontSize: "11px",
  color: "#999",
  margin: "8px 0 0",
};

const hr = {
  borderColor: "#eee",
  margin: "24px 0",
};

const quotaLine = {
  fontSize: "12px",
  color: "#666",
  margin: "0 0 8px",
};

const footerNote = {
  fontSize: "11px",
  color: "#999",
  margin: "0",
};

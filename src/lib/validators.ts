import { z } from "zod";

const MAX_DATE_RANGE_DAYS = 5;

function daysBetween(a: string, b: string) {
  const msPerDay = 86_400_000;
  return Math.round(
    (new Date(b).getTime() - new Date(a).getTime()) / msPerDay
  );
}

export const createTrackerSchema = z
  .object({
    email: z.string().email("유효한 이메일 주소를 입력해주세요"),
    origin: z
      .string()
      .length(3, "출발 공항을 선택해주세요")
      .toUpperCase(),
    destination: z
      .string()
      .length(3, "도착 공항을 선택해주세요")
      .toUpperCase(),
    departStart: z.string().date("출발 시작일이 올바르지 않습니다"),
    departEnd: z.string().date("출발 종료일이 올바르지 않습니다"),
    returnStart: z.string().date("귀국 시작일이 올바르지 않습니다"),
    returnEnd: z.string().date("귀국 종료일이 올바르지 않습니다"),
    adults: z.number().int().min(1).max(9).default(1),
  })
  .refine((data) => data.origin !== data.destination, {
    message: "출발 공항과 도착 공항이 같을 수 없습니다",
    path: ["destination"],
  })
  .refine((data) => data.departEnd >= data.departStart, {
    message: "출발 종료일은 시작일 이후여야 합니다",
    path: ["departEnd"],
  })
  .refine((data) => data.returnEnd >= data.returnStart, {
    message: "귀국 종료일은 시작일 이후여야 합니다",
    path: ["returnEnd"],
  })
  .refine((data) => data.returnStart >= data.departStart, {
    message: "귀국 날짜는 출발 날짜 이후여야 합니다",
    path: ["returnStart"],
  })
  .refine(
    (data) => daysBetween(data.departStart, data.departEnd) < MAX_DATE_RANGE_DAYS,
    {
      message: `출발 날짜 범위는 ${MAX_DATE_RANGE_DAYS}일을 초과할 수 없습니다`,
      path: ["departEnd"],
    }
  )
  .refine(
    (data) => daysBetween(data.returnStart, data.returnEnd) < MAX_DATE_RANGE_DAYS,
    {
      message: `귀국 날짜 범위는 ${MAX_DATE_RANGE_DAYS}일을 초과할 수 없습니다`,
      path: ["returnEnd"],
    }
  )
  .refine(
    (data) => new Date(data.departStart) > new Date(),
    {
      message: "출발 날짜는 오늘 이후여야 합니다",
      path: ["departStart"],
    }
  );

export type CreateTrackerInput = z.infer<typeof createTrackerSchema>;

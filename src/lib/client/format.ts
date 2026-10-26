import { formatWon } from "@/lib/domain/evaluate";

export { formatWon };

/** note: 비용을 '기타'로 고르고 적은 내용 */
export function formatCost(cost: number | null, note?: string): string {
  if (cost === null) return note ? `비용: ${note}` : "비용 미확인";
  if (cost === 0) return "무료";
  return `1인 ${formatWon(cost)}`;
}

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${m}월 ${d}일 (${DAYS[date.getDay()]})`;
}

export function formatTrip(start: string, end: string | null): string {
  if (!end || end === start) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/** 여행 일수: "1박 2일", 같은 날이거나 종료일이 없으면 "당일치기" (날짜는 YYYY-MM-DD) */
export function formatTripLength(start: string, end: string | null): string {
  if (!end) return "당일치기";
  const nights = Math.round((Date.UTC(...ymd(end)) - Date.UTC(...ymd(start))) / 86_400_000);
  return nights <= 0 ? "당일치기" : `${nights}박 ${nights + 1}일`;
}

function ymd(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m - 1, d];
}

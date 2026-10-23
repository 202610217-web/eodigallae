import { formatWon } from "@/lib/domain/evaluate";

export { formatWon };

export function formatCost(cost: number | null): string {
  if (cost === null) return "비용 미확인";
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

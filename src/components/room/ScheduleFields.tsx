"use client";

import { Clock } from "lucide-react";
import { TextInput } from "@/components/ui/Field";
import { cn } from "@/lib/client/cn";
import { formatDayDate } from "@/lib/client/format";

/** 결정 카드 일정 입력: 몇 일차 + 시작 시각 (둘 다 비워 둘 수 있음) */
export function ScheduleFields({
  idPrefix,
  day,
  time,
  dayCount,
  tripStart,
  onChange,
  className,
}: {
  idPrefix: string;
  day: number | null;
  time: string | null;
  dayCount: number;
  /** 있으면 일차 옆에 날짜도 보여준다 */
  tripStart?: string;
  onChange: (next: { day: number | null; time: string | null }) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Clock className="size-4 shrink-0 text-ink-soft" aria-hidden />
      <select
        id={`${idPrefix}-day`}
        aria-label="일차"
        value={day ?? ""}
        onChange={(e) => onChange({ day: e.target.value ? Number(e.target.value) : null, time })}
        className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-white px-3 text-sm text-ink focus:border-coral focus:outline-none"
      >
        <option value="">일차 미정</option>
        {Array.from({ length: dayCount }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}일차{tripStart ? ` · ${formatDayDate(tripStart, d)}` : ""}
          </option>
        ))}
      </select>
      <TextInput
        id={`${idPrefix}-time`}
        aria-label="시작 시간"
        type="time"
        value={time ?? ""}
        onChange={(e) => onChange({ day, time: e.target.value || null })}
        className="min-h-11 w-32 shrink-0 text-sm"
      />
    </div>
  );
}

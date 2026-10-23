import { CircleCheck, CircleHelp, Info, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/client/cn";
import type { CandidateEvaluation } from "@/lib/domain/types";

const TONE = {
  good: { icon: CircleCheck, className: "text-success-ink" },
  warn: { icon: CircleHelp, className: "text-warning-ink" },
  bad: { icon: TriangleAlert, className: "text-danger-ink" },
  info: { icon: Info, className: "text-info-ink" },
} as const;

/** 점수보다 먼저 보여주는 추천·주의 이유 목록 */
export function ReasonList({ reasons, className }: { reasons: CandidateEvaluation["reasons"]; className?: string }) {
  if (reasons.length === 0) return null;
  return (
    <ul className={cn("space-y-1", className)}>
      {reasons.map((r) => {
        const { icon: Icon, className: tone } = TONE[r.tone];
        return (
          <li key={r.text} className="flex items-start gap-1.5 text-sm">
            <Icon className={cn("mt-0.5 size-4 shrink-0", tone)} aria-hidden />
            <span className={r.tone === "bad" ? "font-semibold text-danger-ink" : undefined}>{r.text}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SimpleReasonList({ reasons }: { reasons: string[] }) {
  return <ReasonList reasons={reasons.map((text) => ({ tone: "good" as const, text }))} />;
}

import { TriangleAlert } from "lucide-react";
import { cn } from "@/lib/client/cn";
import type { CandidateEvaluation } from "@/lib/domain/types";

/** 조건 충돌 후보도 결정 대상에 포함되므로, 고르기 전에 충돌 내용을 함께 보여준다. */
export function ConflictHint({ evaluation, className }: { evaluation: CandidateEvaluation | undefined; className?: string }) {
  if (evaluation?.state !== "conflict") return null;
  return (
    <span className={cn("mt-1.5 flex gap-1 text-xs font-semibold text-danger-ink", className)}>
      <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>조건 충돌: {evaluation.conflicts.join(" · ")}</span>
    </span>
  );
}

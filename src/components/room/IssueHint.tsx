import { CircleHelp, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/client/cn";
import type { CandidateEvaluation } from "@/lib/domain/types";

/** 조건 충돌·확인 필요 후보도 결정에 들어갈 수 있으므로, 고를 때 그 이유를 함께 보여준다. */
export function IssueHint({ evaluation, className }: { evaluation: CandidateEvaluation | undefined; className?: string }) {
  if (!evaluation || evaluation.state === "pass") return null;
  const conflict = evaluation.state === "conflict";
  return (
    <span className={cn("mt-1.5 flex gap-1 text-xs font-semibold", conflict ? "text-danger-ink" : "text-warning-ink", className)}>
      {conflict ? <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden /> : <CircleHelp className="mt-px size-3.5 shrink-0" aria-hidden />}
      <span>
        {conflict ? "조건 충돌" : "확인 필요"}: {(conflict ? evaluation.conflicts : evaluation.needsCheck).join(" · ")}
      </span>
    </span>
  );
}

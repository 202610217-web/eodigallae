"use client";

import { ArrowLeft, CircleHelp, Dices, Hand, ListChecks, Play, Plus, TriangleAlert, Vote, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { ToggleChip } from "@/components/ui/Field";
import { CheckBadge } from "@/components/ui/StatusBadge";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import { BATTLE_TAP_MS, type DecisionMode } from "@/lib/domain/constants";
import type { CandidateEvaluation, DecisionCardView } from "@/lib/domain/types";

export const MODE_INFO: Record<DecisionMode, { icon: LucideIcon; title: string; desc: string }> = {
  vote: { icon: Vote, title: "다수결", desc: "한 사람당 한 표. 마감 전에는 득표수를 숨기고, 동점이면 룰렛으로." },
  roulette: { icon: Dices, title: "운명의 룰렛", desc: "결정 대상 후보를 모두 같은 확률로 넣고 돌려요." },
  battle: { icon: Hand, title: "결정권 쟁탈전", desc: `${BATTLE_TAP_MS / 1000}초 연타 대결! 1등이 결정 대상 후보 중 하나를 골라요.` },
};

/**
 * 결정 방식 고르기 → (조건 충돌·확인 필요 후보가 있으면) 후보별 이유를 보고 뺄 후보 고르기 → 결정 시작.
 * 문제가 있는 후보도 자동으로 빼지 않는다. 방장이 직접 고른 후보만 뺀다.
 */
export function DecisionModePicker({
  card,
  onAddCandidate,
}: {
  card: DecisionCardView;
  onAddCandidate: () => void;
}) {
  const { view, act } = useRoom();
  const [mode, setMode] = useState<DecisionMode>("vote");
  const [step, setStep] = useState<"mode" | "review">("mode");
  const [excluded, setExcluded] = useState<Set<string>>(() => new Set());
  const [starting, setStarting] = useState(false);
  const issues = card.evaluations.filter((e) => e.state !== "pass");
  const conflictCount = issues.filter((e) => e.state === "conflict").length;
  const needsCount = issues.length - conflictCount;
  const notReady = view.members.length - card.conditions.filter((c) => c.ready).length;
  const nameOf = (id: string) => card.candidates.find((c) => c.id === id)?.name ?? "후보";

  if (card.candidates.length === 0) {
    return (
      <Notice tone="info" icon={<ListChecks className="size-5" aria-hidden />} title="아직 등록된 후보가 없어요.">
        <p>후보를 하나 이상 등록하면 결정을 시작할 수 있어요.</p>
        <Button className="mt-3" size="sm" icon={<Plus className="size-3.5" aria-hidden />} onClick={onAddCandidate}>
          후보 추가하기
        </Button>
      </Notice>
    );
  }

  if (!view.me.isHost) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-5 text-center">
        <p className="font-bold">방장이 결정 방식을 고르면 여기서 함께 진행해요.</p>
        <p className="mt-1 text-sm text-ink-soft">
          후보 {card.candidates.length}개
          {issues.length > 0 && ` 중 조건 충돌 ${conflictCount}개·확인 필요 ${needsCount}개는 방장이 결정 전에 넣을지 뺄지 골라요.`}
        </p>
      </div>
    );
  }

  const included = card.evaluations.filter((e) => !excluded.has(e.candidateId));

  const start = async () => {
    setStarting(true);
    await act({ type: "startDecision", cardId: card.id, mode, excludeIds: [...excluded] });
    setStarting(false);
  };

  const toggle = (id: string) =>
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (step === "review") {
    return (
      <div className="space-y-4">
        <div className="rounded-[var(--radius-card)] bg-white p-4">
          <p className="font-bold">결정 전에 확인해주세요</p>
          <p className="mt-1 text-sm text-ink-soft">
            아래 후보는 조건과 충돌하거나 정보가 부족해요. 이유를 보고 이번 결정에서 뺄 후보를 골라주세요. 고르지 않은 후보는 그대로 포함돼요.
          </p>
        </div>

        <ul className="space-y-2">
          {issues.map((e) => (
            <IssueRow key={e.candidateId} evaluation={e} card={card} excluded={excluded.has(e.candidateId)} onToggle={() => toggle(e.candidateId)} />
          ))}
        </ul>

        <div className="rounded-[var(--radius-card)] bg-white p-4">
          <p className="text-sm font-bold">
            결정에 넣을 후보 {included.length}개{excluded.size > 0 && <span className="font-medium text-ink-soft"> · 제외 {excluded.size}개</span>}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{included.map((e) => nameOf(e.candidateId)).join(" · ") || "없음"}</p>
        </div>

        {included.length === 0 && (
          <Notice tone="danger" icon={<TriangleAlert className="size-5" aria-hidden />} title="모든 후보를 뺄 수는 없어요.">
            결정에 넣을 후보를 하나 이상 남겨주세요.
          </Notice>
        )}

        <div className="grid grid-cols-[auto_1fr] gap-2">
          <Button size="lg" variant="secondary" icon={<ArrowLeft className="size-4" aria-hidden />} onClick={() => setStep("mode")}>
            이전
          </Button>
          <Button size="lg" block loading={starting} disabled={included.length === 0} icon={<Play className="size-4" aria-hidden />} onClick={start}>
            {MODE_INFO[mode].title}로 결정 시작
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="결정 방식" className="grid gap-2 md:grid-cols-3">
        {(Object.keys(MODE_INFO) as DecisionMode[]).map((key) => {
          const info = MODE_INFO[key];
          const Icon = info.icon;
          const selected = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(key)}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4 text-left transition-colors md:flex-col",
                selected ? "border-coral-strong" : "border-transparent hover:border-line",
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-coral-strong text-white" : "bg-cream text-ink")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{info.title}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{info.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="text-sm font-bold">후보 {card.candidates.length}개</p>
        <p className="mt-1 text-sm text-ink-soft">{card.evaluations.map((e) => nameOf(e.candidateId)).join(" · ")}</p>
        <p className="mt-2 text-xs text-ink-soft">결정 중에는 후보와 조건이 잠겨요.</p>
      </div>

      {issues.length > 0 && (
        <Notice
          tone="warning"
          icon={<CircleHelp className="size-5" aria-hidden />}
          title={`문제가 있는 후보 ${issues.length}개 (조건 충돌 ${conflictCount} · 확인 필요 ${needsCount})`}
        >
          다음 단계에서 후보별 이유를 보고, 이번 결정에서 뺄 후보를 고를 수 있어요.
        </Notice>
      )}

      {notReady > 0 && (
        <Notice tone="warning" icon={<TriangleAlert className="size-5" aria-hidden />} title={`아직 ${notReady}명이 조건 준비를 마치지 않았어요.`}>
          지금 시작하면 그 친구의 조건 변경은 이번 결정에 반영되지 않아요.
        </Notice>
      )}

      {issues.length > 0 ? (
        <Button size="lg" block icon={<ListChecks className="size-4" aria-hidden />} onClick={() => setStep("review")}>
          다음: 문제 있는 후보 확인하기
        </Button>
      ) : (
        <Button size="lg" block loading={starting} icon={<Play className="size-4" aria-hidden />} onClick={start}>
          {MODE_INFO[mode].title}로 결정 시작
        </Button>
      )}
    </div>
  );
}

function IssueRow({
  evaluation,
  card,
  excluded,
  onToggle,
}: {
  evaluation: CandidateEvaluation;
  card: DecisionCardView;
  excluded: boolean;
  onToggle: () => void;
}) {
  const candidate = card.candidates.find((c) => c.id === evaluation.candidateId);
  if (!candidate) return null;
  return (
    <li className={cn("rounded-[var(--radius-card)] border-2 bg-white p-4 transition-colors", excluded ? "border-line opacity-70" : "border-transparent")}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <CheckBadge state={evaluation.state} />
          <p className={cn("mt-1.5 font-bold break-words", excluded && "line-through")}>{candidate.name}</p>
          <p className="text-sm text-ink-soft">{formatCost(candidate.cost, candidate.notes.cost)}</p>
        </div>
        <ToggleChip selected={excluded} tone="danger" onClick={onToggle}>
          결정에서 빼기
        </ToggleChip>
      </div>
      <ul className="mt-3 space-y-1 rounded-xl bg-cream p-3 text-sm">
        {evaluation.conflicts.map((text) => (
          <li key={text} className="flex gap-1.5 text-danger-ink">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {text}
          </li>
        ))}
        {evaluation.needsCheck.map((text) => (
          <li key={text} className="flex gap-1.5 text-warning-ink">
            <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden /> {text}
          </li>
        ))}
      </ul>
    </li>
  );
}

"use client";

import { ChevronDown, CircleHelp, ExternalLink, MapPinPlus, Pencil, Plus, SlidersHorizontal, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { CheckBadge, Pill } from "@/components/ui/StatusBadge";
import { EmptyState, Notice } from "@/components/ui/States";
import { TasteTags } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import type { Candidate, CandidateEvaluation, DecisionCardView } from "@/lib/domain/types";
import { CandidateForm } from "./CandidateForm";
import { ReasonList } from "./ReasonList";
import { useRoom } from "./RoomProvider";

export function CandidateCard({
  candidate,
  evaluation,
  index,
  canEdit,
  onEdit,
  onDelete,
  defaultOpen,
}: {
  candidate: Candidate;
  evaluation: CandidateEvaluation | undefined;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  defaultOpen?: boolean;
}) {
  const { view } = useRoom();
  const [detailOpen, setDetailOpen] = useState(defaultOpen ?? false);
  const author = view.members.find((m) => m.id === candidate.createdBy);
  const issues = [...(evaluation?.conflicts ?? []), ...(evaluation?.needsCheck ?? [])];

  return (
    <article
      id={`cand-${candidate.id}`}
      className={cn(
        "stagger rounded-[var(--radius-card)] border bg-white p-4",
        evaluation?.state === "conflict" ? "border-[#f3c4bd]" : evaluation?.recommended ? "border-coral" : "border-transparent",
      )}
      style={{ "--i": index } as CSSProperties}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        {evaluation && <CheckBadge state={evaluation.state} />}
        {evaluation?.recommended && (
          <Pill tone="coral" icon={<Sparkles className="size-3.5" aria-hidden />}>
            추천
          </Pill>
        )}
      </div>

      <div className="mt-2 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-lg font-bold leading-snug break-words">{candidate.name}</h4>
          <p className={cn("text-sm font-semibold", candidate.cost === null ? "text-warning-ink" : "text-ink-soft")}>{formatCost(candidate.cost, candidate.notes.cost)}</p>
        </div>
        {canEdit && (
          <div className="flex shrink-0">
            <button type="button" onClick={onEdit} className="flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-cream" aria-label={`${candidate.name} 수정`}>
              <Pencil className="size-4" aria-hidden />
            </button>
            <button type="button" onClick={onDelete} className="flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-danger hover:text-danger-ink" aria-label={`${candidate.name} 삭제`}>
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      <TasteTags tags={candidate.tags} className="mt-2" />
      {candidate.description && <p className="mt-2 text-sm text-ink break-words">{candidate.description}</p>}
      {(candidate.notes.setting || candidate.notes.vibe) && (
        <p className="mt-1 text-xs text-ink-soft break-words">
          {candidate.notes.setting && <>실내·야외: {candidate.notes.setting}</>}
          {candidate.notes.setting && candidate.notes.vibe && " · "}
          {candidate.notes.vibe && <>분위기: {candidate.notes.vibe}</>}
        </p>
      )}

      {evaluation && evaluation.reasons.length > 0 && (
        <div className="mt-3 rounded-xl bg-cream px-3 py-2.5">
          <ReasonList reasons={evaluation.reasons} />
        </div>
      )}

      {issues.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            aria-expanded={detailOpen}
            onClick={() => setDetailOpen((v) => !v)}
            className="flex min-h-11 items-center gap-1 text-sm font-semibold text-ink-soft"
          >
            <ChevronDown className={cn("size-4 transition-transform", detailOpen && "rotate-180")} aria-hidden />
            {evaluation?.state === "conflict" ? "충돌 이유 확인" : "확인이 필요한 정보"}
          </button>
          {detailOpen && (
            <ul className="mt-1 space-y-1 rounded-xl border border-line p-3 text-sm">
              {evaluation?.conflicts.map((c) => (
                <li key={c} className="flex gap-1.5 text-danger-ink">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden /> {c}
                </li>
              ))}
              {evaluation?.needsCheck.map((c) => (
                <li key={c} className="flex gap-1.5 text-warning-ink">
                  <CircleHelp className="mt-0.5 size-4 shrink-0" aria-hidden /> {c}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
        {author && (
          <span className="flex items-center gap-1.5">
            <Avatar character={author.character} color={author.color} size="sm" className="scale-75" />
            {author.nickname}님이 등록
          </span>
        )}
        {candidate.link && (
          <a href={candidate.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-9 items-center gap-1 font-semibold text-info-ink">
            <ExternalLink className="size-3.5" aria-hidden /> 지도·참고 링크
          </a>
        )}
      </div>
    </article>
  );
}

/** 후보 목록 탭: 상태 요약, 빈 상태, 전원 충돌 상태, 후보 카드들 */
export function CandidateList({
  card,
  editable,
  onEditConditions,
}: {
  card: DecisionCardView;
  editable: boolean;
  onEditConditions: () => void;
}) {
  const { view, act } = useRoom();
  const [form, setForm] = useState<{ editing: Candidate | null; key: number } | null>(null);
  const [revealConflicts, setRevealConflicts] = useState(false);
  const evalById = new Map(card.evaluations.map((e) => [e.candidateId, e]));
  const ordered = card.evaluations
    .map((e) => card.candidates.find((c) => c.id === e.candidateId))
    .filter((c): c is Candidate => Boolean(c));
  const pass = card.evaluations.filter((e) => e.state === "pass").length;
  const needs = card.evaluations.filter((e) => e.state === "needs_check").length;
  const conflict = card.evaluations.filter((e) => e.state === "conflict").length;

  // key를 바꿔 폼을 매번 새로 연다
  const openForm = (editing: Candidate | null) => setForm((prev) => ({ editing, key: (prev?.key ?? 0) + 1 }));

  const remove = async (c: Candidate) => {
    if (!window.confirm(`‘${c.name}’ 후보를 삭제할까요?`)) return;
    await act({ type: "deleteCandidate", candidateId: c.id });
  };

  const showConflicts = () => {
    setRevealConflicts(true);
    const first = card.evaluations.find((e) => e.state !== "pass");
    window.setTimeout(() => document.getElementById(`cand-${first?.candidateId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  return (
    <div className="space-y-4">
      {card.candidates.length === 0 ? (
        <EmptyState
          icon={<MapPinPlus className="size-6" aria-hidden />}
          title="첫 번째 후보를 등록해주세요."
          description="가고 싶은 장소나 하고 싶은 활동을 올리면 모두의 조건과 자동으로 비교해드려요."
          action={
            editable && (
              <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => openForm(null)}>
                후보 추가하기
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5" aria-label="후보 판정 요약">
            <Pill tone="success">필수 조건 통과 {pass}</Pill>
            <Pill tone="warning">확인 필요 {needs}</Pill>
            <Pill tone="danger">조건 충돌 {conflict}</Pill>
          </div>

          {conflict + needs > 0 && (
            <Notice
              tone="warning"
              icon={<CircleHelp className="size-5" aria-hidden />}
              title={`조건 충돌 ${conflict}개 · 확인 필요 ${needs}개 후보가 있어요.`}
            >
              <p>자동으로 빠지지 않아요. 방장이 결정을 시작할 때 후보별 이유를 보고 이번 결정에서 뺄지 골라요.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={showConflicts}>
                  이유 확인
                </Button>
                <Button size="sm" variant="secondary" icon={<SlidersHorizontal className="size-3.5" aria-hidden />} onClick={onEditConditions}>
                  내 조건 수정
                </Button>
              </div>
            </Notice>
          )}

          <p className="text-xs text-ink-soft">순서는 필수 조건 통과 여부로 정한 참고용이에요. 최종 결정은 함께 정해요.</p>

          <div className="space-y-3">
            {ordered.map((c, i) => (
              <CandidateCard
                key={`${c.id}-${revealConflicts}`}
                candidate={c}
                evaluation={evalById.get(c.id)}
                index={i}
                canEdit={editable && (c.createdBy === view.me.id || view.me.isHost)}
                onEdit={() => openForm(c)}
                onDelete={() => remove(c)}
                defaultOpen={revealConflicts}
              />
            ))}
          </div>

          {editable && (
            <Button variant="secondary" size="lg" block icon={<Plus className="size-4" aria-hidden />} onClick={() => openForm(null)}>
              후보 추가하기
            </Button>
          )}
        </>
      )}

      {form && <CandidateForm key={form.key} open onClose={() => setForm(null)} card={card} editing={form.editing} />}
    </div>
  );
}

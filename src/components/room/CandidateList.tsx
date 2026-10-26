"use client";

import { ExternalLink, MapPinPlus, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState, Notice } from "@/components/ui/States";
import { TasteTags } from "@/components/ui/TasteChip";
import { cn } from "@/lib/client/cn";
import { formatCost } from "@/lib/client/format";
import { hasSubmittedOpinion } from "@/lib/client/selectors";
import type { Candidate, DecisionCardView } from "@/lib/domain/types";
import { CandidateForm } from "./CandidateForm";
import { useRoom } from "./RoomProvider";

export function CandidateCard({
  candidate,
  index,
  canEdit,
  onEdit,
  onDelete,
}: {
  candidate: Candidate;
  index: number;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { view } = useRoom();
  const author = view.members.find((m) => m.id === candidate.createdBy);

  return (
    <article id={`cand-${candidate.id}`} className="stagger rounded-[var(--radius-card)] border border-transparent bg-white p-4" style={{ "--i": index } as CSSProperties}>
      <div className="flex items-start gap-2">
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

/** 후보 목록 탭. 후보는 이 일정에 의견을 제출한 사람만 등록할 수 있다 (서버도 같은 규칙으로 막는다). */
export function CandidateList({
  card,
  editable,
  onOpenOpinion,
}: {
  card: DecisionCardView;
  editable: boolean;
  onOpenOpinion: () => void;
}) {
  const { view, act } = useRoom();
  const [form, setForm] = useState<{ editing: Candidate | null; key: number } | null>(null);
  const submitted = hasSubmittedOpinion(card, view.me.id);
  const canAdd = editable && submitted;
  const ordered = [...card.candidates].sort((a, b) => a.createdAt - b.createdAt);

  // key를 바꿔 폼을 매번 새로 연다
  const openForm = (editing: Candidate | null) => setForm((prev) => ({ editing, key: (prev?.key ?? 0) + 1 }));

  const remove = async (c: Candidate) => {
    if (!window.confirm(`‘${c.name}’ 후보를 삭제할까요?`)) return;
    await act({ type: "deleteCandidate", candidateId: c.id });
  };

  const opinionNotice = editable && !submitted && (
    <Notice tone="info" icon={<MessageSquareText className="size-5" aria-hidden />} title="의견을 제출하면 후보를 등록할 수 있어요.">
      <p>
        {card.opinion.questions.length > 0
          ? "이 일정의 의견 투표에 답하면 친구들의 익명 집계를 보고 후보를 올릴 수 있어요."
          : view.me.isHost
            ? "먼저 이 일정의 의견 투표 질문을 만들고 의견을 제출해주세요."
            : "방장이 의견 투표 질문을 만들면 의견을 제출하고 후보를 올릴 수 있어요."}
      </p>
      <Button className="mt-3" size="sm" variant="secondary" onClick={onOpenOpinion}>
        의견 투표로 가기
      </Button>
    </Notice>
  );

  return (
    <div className="space-y-4">
      {opinionNotice}

      {card.candidates.length === 0 ? (
        <EmptyState
          icon={<MapPinPlus className="size-6" aria-hidden />}
          title="아직 등록된 후보가 없어요."
          description="의견 집계를 참고해서 가고 싶은 장소나 하고 싶은 활동을 올려주세요."
          action={
            canAdd && (
              <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => openForm(null)}>
                후보 추가하기
              </Button>
            )
          }
        />
      ) : (
        <>
          <div className="space-y-3">
            {ordered.map((c, i) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                index={i}
                canEdit={editable && (c.createdBy === view.me.id || view.me.isHost)}
                onEdit={() => openForm(c)}
                onDelete={() => remove(c)}
              />
            ))}
          </div>

          {canAdd && (
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

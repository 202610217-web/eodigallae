"use client";

import { CircleCheck, Lock, MessageSquareText, Pencil, Plus, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { FieldError, TextInput, ToggleChip } from "@/components/ui/Field";
import { Pill } from "@/components/ui/StatusBadge";
import { EmptyState, Notice } from "@/components/ui/States";
import { hasSubmittedOpinion } from "@/lib/client/selectors";
import { LIMITS } from "@/lib/domain/constants";
import { normalizeAnswers, normalizeQuestions } from "@/lib/domain/opinion";
import type { DecisionCardView, OpinionAnswer, OpinionQuestion, OpinionQuestionResult } from "@/lib/domain/types";
import { newQuestionDraft, QuestionFields, toQuestionDrafts, toQuestionInputs, type QuestionDraft } from "./QuestionFields";
import { useRoom } from "./RoomProvider";

/**
 * 의견 투표 탭: 방장이 이 일정의 질문·보기를 만들고, 모두가 같은 질문에 답한다.
 * 제출한 사람에게만 서버가 익명 집계를 보내 준다 (보기별 인원, 기타 인원, 기타 의견 원문).
 */
export function OpinionPanel({ card, editable, lockedReason }: { card: DecisionCardView; editable: boolean; lockedReason: string | null }) {
  const { view } = useRoom();
  const { questions, submittedMemberIds } = card.opinion;
  const submitted = hasSubmittedOpinion(card, view.me.id);
  // 응답이 하나라도 있으면 질문 구조를 잠가 기존 응답의 뜻이 바뀌지 않게 한다
  const questionsEditable = view.me.isHost && editable && submittedMemberIds.length === 0;
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [editingAnswers, setEditingAnswers] = useState(false);

  return (
    <div className="space-y-5">
      {lockedReason && (
        <Notice tone="info" icon={<ShieldAlert className="size-5" aria-hidden />} title="지금은 의견을 바꿀 수 없어요">
          {lockedReason}
        </Notice>
      )}

      {questionsEditable && editingQuestions ? (
        <QuestionEditor key={questions.map((q) => q.id).join()} card={card} onDone={() => setEditingQuestions(false)} />
      ) : questions.length === 0 ? (
        <EmptyState
          icon={<MessageSquareText className="size-6" aria-hidden />}
          title={view.me.isHost ? "이 카드에는 아직 질문이 없어요." : "방장이 아직 질문을 만들지 않았어요."}
          description={
            view.me.isHost
              ? "모임을 만들 때 정하지 않았다면 여기서 추가할 수 있어요. 예산, 메뉴, 피할 음식처럼 친구들에게 물어볼 것을 직접 정해요."
              : "질문이 생기면 여기서 의견을 내고, 의견을 낸 뒤 후보를 등록할 수 있어요."
          }
          action={
            questionsEditable && (
              <Button icon={<Plus className="size-4" aria-hidden />} onClick={() => setEditingQuestions(true)}>
                질문 추가
              </Button>
            )
          }
        />
      ) : submitted && !editingAnswers ? (
        <Results
          card={card}
          onEdit={
            editable
              ? () => {
                  setEditingAnswers(true);
                }
              : undefined
          }
        />
      ) : editable ? (
        <div className="space-y-3">
          {questionsEditable && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 text-sm">
              <span className="text-ink-soft">의견이 하나라도 제출되면 질문과 보기를 바꿀 수 없어요.</span>
              <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" aria-hidden />} onClick={() => setEditingQuestions(true)}>
                질문 수정
              </Button>
            </div>
          )}
          <AnswerForm key={`${card.id}-${submitted}`} card={card} onDone={() => setEditingAnswers(false)} onCancel={submitted ? () => setEditingAnswers(false) : undefined} />
        </div>
      ) : (
        <p className="rounded-xl bg-white p-4 text-sm text-ink-soft">아직 제출한 의견이 없어요.</p>
      )}

      <SubmissionStatus card={card} />
    </div>
  );
}

// ───────────────────────── 질문 고치기 (방장) ─────────────────────────
// 처음 질문은 모임을 만들 때 결정 카드마다 정한다. 여기서는 의견이 들어오기 전까지 고치거나, 질문 없이 만든 카드에 추가한다.

function QuestionEditor({ card, onDone }: { card: DecisionCardView; onDone: () => void }) {
  const { act } = useRoom();
  const existing = card.opinion.questions;
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => (existing.length > 0 ? toQuestionDrafts(existing) : [newQuestionDraft()]));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const input = toQuestionInputs(drafts);
    // 서버와 같은 규칙으로 먼저 안내한다 (id는 서버가 새로 붙인다)
    const checked = normalizeQuestions(input, (p) => p);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setSaving(true);
    const ok = await act({ type: "saveQuestions", cardId: card.id, questions: input });
    setSaving(false);
    if (ok) onDone();
  };

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4">
      <h3 className="font-bold">이 일정의 의견 투표 질문</h3>
      <p className="mt-1 mb-4 text-sm text-ink-soft">
        질문 이름과 보기를 직접 적어주세요. 모든 질문에는 ‘기타(직접 입력)’가 자동으로 들어가요. 의견이 하나라도 제출되면 바꿀 수 없어요.
      </p>
      <QuestionFields idPrefix={`edit-${card.id}`} drafts={drafts} onChange={setDrafts} />
      <FieldError>{error}</FieldError>
      <div className="mt-4 flex gap-2">
        {existing.length > 0 && (
          <Button variant="ghost" size="lg" onClick={onDone}>
            취소
          </Button>
        )}
        <Button size="lg" className="flex-1" loading={saving} icon={<CircleCheck className="size-5" aria-hidden />} onClick={save}>
          질문 저장
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── 의견 내기 ─────────────────────────

interface AnswerDraft {
  optionIds: string[];
  otherOn: boolean;
  other: string;
}

function toDraft(questions: OpinionQuestion[], mine: Record<string, OpinionAnswer> | null): Record<string, AnswerDraft> {
  return Object.fromEntries(
    questions.map((q) => {
      const a = mine?.[q.id];
      return [q.id, { optionIds: a?.optionIds ?? [], otherOn: a ? a.other !== null : false, other: a?.other ?? "" }];
    }),
  );
}

function AnswerForm({ card, onDone, onCancel }: { card: DecisionCardView; onDone: () => void; onCancel?: () => void }) {
  const { act } = useRoom();
  const { questions, myAnswers } = card.opinion;
  // 임시 입력은 이 화면에만 두고 서버에 보내지 않는다 (집계에는 제출한 응답만 들어간다)
  const [drafts, setDrafts] = useState(() => toDraft(questions, myAnswers));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setDraft = (qid: string, patch: Partial<AnswerDraft>) => setDrafts((d) => ({ ...d, [qid]: { ...d[qid], ...patch } }));

  const toggleOption = (q: OpinionQuestion, optionId: string) => {
    const d = drafts[q.id];
    if (q.multiple) {
      setDraft(q.id, { optionIds: d.optionIds.includes(optionId) ? d.optionIds.filter((x) => x !== optionId) : [...d.optionIds, optionId] });
    } else {
      // 하나만 고르는 질문은 보기를 고르면 기타가 풀린다
      setDraft(q.id, { optionIds: d.optionIds.includes(optionId) ? [] : [optionId], otherOn: false });
    }
  };

  const toggleOther = (q: OpinionQuestion) => {
    const d = drafts[q.id];
    setDraft(q.id, q.multiple ? { otherOn: !d.otherOn } : { otherOn: !d.otherOn, optionIds: [] });
  };

  const submit = async () => {
    const answers = Object.fromEntries(
      questions.map((q) => [q.id, { optionIds: drafts[q.id].optionIds, other: drafts[q.id].otherOn ? drafts[q.id].other : null }]),
    );
    const checked = normalizeAnswers(questions, answers);
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    setError(null);
    setSaving(true);
    const ok = await act({ type: "submitOpinion", cardId: card.id, answers: checked.value });
    setSaving(false);
    if (ok) onDone();
  };

  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4">
      <h3 className="font-bold">{myAnswers ? "내 의견 수정" : "내 의견"}</h3>
      <p className="mt-1 text-sm text-ink-soft">모든 질문에 답하고 제출하면 친구들의 익명 집계를 볼 수 있어요. 누가 무엇을 골랐는지는 보이지 않아요.</p>

      <div className="mt-4 space-y-5">
        {questions.map((q) => {
          const d = drafts[q.id];
          return (
            <div key={q.id} role="group" aria-labelledby={`ans-${q.id}`}>
              <p id={`ans-${q.id}`} className="mb-2 flex flex-wrap items-baseline justify-between gap-x-2">
                <span className="text-sm font-bold">{q.title}</span>
                <span className="text-xs text-ink-soft">{q.multiple ? "여러 개 골라도 돼요" : "하나만 골라요"}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o) => (
                  <ToggleChip key={o.id} selected={d.optionIds.includes(o.id)} onClick={() => toggleOption(q, o.id)}>
                    {o.label}
                  </ToggleChip>
                ))}
                <ToggleChip selected={d.otherOn} onClick={() => toggleOther(q)}>
                  기타
                </ToggleChip>
              </div>
              {d.otherOn && (
                <TextInput
                  aria-label={`${q.title} 기타 내용`}
                  className="mt-2"
                  maxLength={LIMITS.otherText}
                  placeholder="의견을 직접 적어주세요"
                  value={d.other}
                  onChange={(e) => setDraft(q.id, { other: e.target.value })}
                />
              )}
            </div>
          );
        })}
      </div>

      <FieldError>{error}</FieldError>
      <div className="mt-5 flex gap-2">
        {onCancel && (
          <Button variant="ghost" size="lg" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button size="lg" className="flex-1" loading={saving} icon={<CircleCheck className="size-5" aria-hidden />} onClick={submit}>
          {myAnswers ? "수정한 의견 제출" : "의견 제출"}
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── 익명 집계 ─────────────────────────

function Results({ card, onEdit }: { card: DecisionCardView; onEdit?: () => void }) {
  const { questions, results, myAnswers } = card.opinion;
  if (!results) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-card)] bg-white p-4">
        <p className="flex items-center gap-2 font-bold">
          <span className="flex size-7 animate-pop items-center justify-center rounded-full bg-success text-success-ink">
            <CircleCheck className="size-4" aria-hidden />
          </span>
          의견 제출 완료 · {results.respondents}명의 익명 집계
        </p>
        {onEdit && (
          <Button size="sm" variant="secondary" icon={<Pencil className="size-3.5" aria-hidden />} onClick={onEdit}>
            내 의견 수정
          </Button>
        )}
      </div>
      <p className="flex items-center gap-1.5 px-1 text-xs text-ink-soft">
        <Lock className="size-3.5" aria-hidden /> 누가 무엇을 골랐는지는 보여주지 않아요. 집계를 참고해서 후보를 등록해보세요.
      </p>
      {questions.map((q) => {
        const r = results.questions.find((x) => x.questionId === q.id);
        return r ? <QuestionResult key={q.id} question={q} result={r} respondents={results.respondents} mine={myAnswers?.[q.id] ?? null} /> : null;
      })}
    </div>
  );
}

function QuestionResult({
  question,
  result,
  respondents,
  mine,
}: {
  question: OpinionQuestion;
  result: OpinionQuestionResult;
  respondents: number;
  mine: OpinionAnswer | null;
}) {
  const rows = [
    ...question.options.map((o) => ({
      key: o.id,
      label: o.label,
      count: result.options.find((x) => x.optionId === o.id)?.count ?? 0,
      chosen: mine?.optionIds.includes(o.id) ?? false,
    })),
    { key: "other", label: "기타", count: result.otherCount, chosen: mine?.other != null },
  ];
  return (
    <section className="rounded-[var(--radius-card)] bg-white p-4" aria-label={`${question.title} 집계`}>
      <h4 className="flex flex-wrap items-baseline justify-between gap-x-2">
        <span className="font-bold">{question.title}</span>
        <span className="text-xs text-ink-soft">{question.multiple ? "복수 선택 · 인원 합이 응답자보다 많을 수 있어요" : "하나만 선택"}</span>
      </h4>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li key={row.key}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="min-w-0 break-words font-semibold">
                {row.label}
                {row.chosen && <span className="ml-1.5 text-xs font-medium text-coral-strong">내 선택</span>}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{row.count}명</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cream-deep" aria-hidden>
              <div className="h-full rounded-full bg-coral transition-[width] duration-500" style={{ width: `${respondents ? (row.count / respondents) * 100 : 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
      {result.otherTexts.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-sm font-bold">기타 의견</p>
          <ul className="space-y-1.5">
            {result.otherTexts.map((text, i) => (
              <li key={i} className="rounded-xl bg-cream px-3 py-2 text-sm break-words">
                “{text}”
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ───────────────────────── 제출 현황 ─────────────────────────

/** 누가 제출했는지만 보여준다 (무엇을 골랐는지는 보여주지 않는다) */
function SubmissionStatus({ card }: { card: DecisionCardView }) {
  const { view } = useRoom();
  const submitted = new Set(card.opinion.submittedMemberIds);
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-4">
      <h3 className="mb-3 font-bold">
        의견 제출 현황 <span className="text-ink-faint">{submitted.size}/{view.members.length}</span>
      </h3>
      <ul className="space-y-2">
        {view.members.map((m) => (
          <li key={m.id} className="flex items-center gap-3">
            <Avatar character={m.character} color={m.color} size="sm" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {m.nickname}
              {m.id === view.me.id && <span className="ml-1 text-xs text-coral-strong">나</span>}
            </span>
            {submitted.has(m.id) ? (
              <Pill tone="success" icon={<CircleCheck className="size-3.5" aria-hidden />}>
                제출 완료
              </Pill>
            ) : (
              <Pill tone="neutral">미제출</Pill>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

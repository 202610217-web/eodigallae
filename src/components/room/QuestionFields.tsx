"use client";

import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Label, Segmented, TextInput } from "@/components/ui/Field";
import { LIMITS } from "@/lib/domain/constants";
import type { QuestionInput } from "@/lib/domain/opinion";
import type { OpinionQuestion } from "@/lib/domain/types";

// 의견 투표 질문 입력칸. 모임을 만들 때(결정 카드마다)와 모임 안에서 질문을 고칠 때 함께 쓴다.

export interface QuestionDraft {
  key: number;
  title: string;
  multiple: boolean;
  options: string[];
}

let draftKey = 0;
export const newQuestionDraft = (): QuestionDraft => ({ key: ++draftKey, title: "", multiple: false, options: ["", ""] });

export function toQuestionDrafts(questions: OpinionQuestion[]): QuestionDraft[] {
  return questions.map((q) => ({ key: ++draftKey, title: q.title, multiple: q.multiple, options: q.options.map((o) => o.label) }));
}

/** 서버로 보낼 질문. 이름도 보기도 비어 있는 질문은 아직 안 만든 것으로 보고 뺀다 */
export function toQuestionInputs(drafts: QuestionDraft[]): QuestionInput[] {
  return drafts
    .filter((d) => d.title.trim() || d.options.some((o) => o.trim()))
    .map(({ title, multiple, options }) => ({ title, multiple, options }));
}

const CHOICE_OPTIONS = [
  { key: "single", label: "하나만 고르기" },
  { key: "multiple", label: "여러 개 고르기" },
] as const;

export function QuestionFields({
  idPrefix,
  drafts,
  onChange,
  label = "",
}: {
  idPrefix: string;
  drafts: QuestionDraft[];
  onChange: (drafts: QuestionDraft[]) => void;
  /** 화면 읽기용 앞말 (예: 카드 이름) */
  label?: string;
}) {
  const update = (key: number, patch: Partial<QuestionDraft>) => onChange(drafts.map((d) => (d.key === key ? { ...d, ...patch } : d)));
  const prefix = label ? `${label} ` : "";

  return (
    <div className="space-y-3">
      {drafts.length > 0 && (
        <ol className="space-y-3">
          {drafts.map((d, qi) => (
            <li key={d.key} className="rounded-xl border border-line bg-white p-3">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`${idPrefix}-q-${d.key}`} hint={`${d.title.length}/${LIMITS.questionTitle}`}>
                    {qi + 1}번째 질문
                  </Label>
                  <TextInput
                    id={`${idPrefix}-q-${d.key}`}
                    aria-label={`${prefix}${qi + 1}번째 질문`}
                    maxLength={LIMITS.questionTitle}
                    placeholder="예: 예산, 메뉴, 피할 음식"
                    value={d.title}
                    onChange={(e) => update(d.key, { title: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onChange(drafts.filter((x) => x.key !== d.key))}
                  className="mt-7 flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-danger hover:text-danger-ink"
                  aria-label={`${prefix}${qi + 1}번째 질문 삭제`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>

              <div className="mt-3">
                <Segmented
                  name={`${prefix}${qi + 1}번째 질문 선택 방식`}
                  value={d.multiple ? "multiple" : "single"}
                  options={CHOICE_OPTIONS}
                  onChange={(v) => update(d.key, { multiple: v === "multiple" })}
                />
              </div>

              <fieldset className="mt-3">
                <legend className="mb-2 text-sm font-bold">보기</legend>
                <ul className="space-y-2">
                  {d.options.map((o, oi) => (
                    <li key={oi} className="flex items-center gap-2">
                      <TextInput
                        aria-label={`${prefix}${qi + 1}번째 질문의 ${oi + 1}번째 보기`}
                        maxLength={LIMITS.optionLabel}
                        placeholder={`보기 ${oi + 1}`}
                        value={o}
                        onChange={(e) => update(d.key, { options: d.options.map((x, i) => (i === oi ? e.target.value : x)) })}
                      />
                      <button
                        type="button"
                        disabled={d.options.length <= LIMITS.minOptions}
                        onClick={() => update(d.key, { options: d.options.filter((_, i) => i !== oi) })}
                        className="flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-cream-deep disabled:opacity-40"
                        aria-label={`${prefix}${qi + 1}번째 질문의 ${oi + 1}번째 보기 삭제`}
                      >
                        <X className="size-4" aria-hidden />
                      </button>
                    </li>
                  ))}
                  <li className="flex min-h-11 items-center gap-2 rounded-xl bg-cream px-3.5 text-sm text-ink-soft">
                    기타 <span className="text-xs">(직접 입력 · 자동으로 들어가요)</span>
                  </li>
                </ul>
                {d.options.length < LIMITS.maxOptions && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="mt-2"
                    icon={<Plus className="size-3.5" aria-hidden />}
                    onClick={() => update(d.key, { options: [...d.options, ""] })}
                  >
                    보기 추가
                  </Button>
                )}
              </fieldset>
            </li>
          ))}
        </ol>
      )}

      {drafts.length < LIMITS.maxQuestions && (
        <Button variant="secondary" block icon={<Plus className="size-4" aria-hidden />} onClick={() => onChange([...drafts, newQuestionDraft()])}>
          질문 추가
        </Button>
      )}
    </div>
  );
}

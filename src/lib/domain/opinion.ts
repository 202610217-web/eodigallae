// 의견 투표: 질문·응답 검사와 익명 집계. 서버(저장 전 검사)와 화면(입력 중 안내)이 같은 규칙을 쓴다.
// 질문과 보기는 방장이 직접 만든 내용이라 해석하지 않는다. 통과·충돌 판정이나 점수로 바꾸지 않고 인원만 센다.

import { LIMITS } from "./constants";
import type { OpinionAnswer, OpinionAnswers, OpinionQuestion, OpinionResults } from "./types";

export interface QuestionInput {
  title: string;
  multiple: boolean;
  options: string[];
}

export type Checked<T> = { ok: true; value: T } | { ok: false; error: string };

/** 중복 비교용: 앞뒤 공백, 연속 공백, 대소문자 차이는 같은 것으로 본다 */
const sameKey = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

const OTHER_LABEL = "기타";

/** 방장이 보낸 질문을 검사하고 앞뒤 공백을 정리한다. id는 newId로 새로 붙인다 (응답이 없을 때만 바꿀 수 있으므로). */
export function normalizeQuestions(input: QuestionInput[], newId: (prefix: string) => string): Checked<OpinionQuestion[]> {
  if (input.length > LIMITS.maxQuestions) return { ok: false, error: `질문은 ${LIMITS.maxQuestions}개까지 만들 수 있어요.` };
  const titles = new Set<string>();
  const out: OpinionQuestion[] = [];
  for (const [i, q] of input.entries()) {
    const title = q.title.trim().replace(/\s+/g, " ");
    const name = title ? `‘${title}’ 질문` : `${i + 1}번째 질문`;
    if (!title) return { ok: false, error: `${i + 1}번째 질문의 이름을 입력해주세요.` };
    if (title.length > LIMITS.questionTitle) return { ok: false, error: `질문 이름은 ${LIMITS.questionTitle}자 이내로 입력해주세요.` };
    if (titles.has(sameKey(title))) return { ok: false, error: `‘${title}’ 질문이 두 번 있어요. 질문 이름을 다르게 적어주세요.` };
    titles.add(sameKey(title));

    const labels = q.options.map((o) => o.trim().replace(/\s+/g, " "));
    if (labels.some((l) => !l)) return { ok: false, error: `${name}에 빈 보기가 있어요. 내용을 적거나 지워주세요.` };
    if (labels.length < LIMITS.minOptions) return { ok: false, error: `${name}에 보기를 ${LIMITS.minOptions}개 이상 만들어주세요.` };
    if (labels.length > LIMITS.maxOptions) return { ok: false, error: `보기는 질문마다 ${LIMITS.maxOptions}개까지 만들 수 있어요.` };
    const tooLong = labels.find((l) => l.length > LIMITS.optionLabel);
    if (tooLong) return { ok: false, error: `보기는 ${LIMITS.optionLabel}자 이내로 입력해주세요: ${tooLong.slice(0, 12)}…` };
    if (labels.some((l) => sameKey(l) === OTHER_LABEL)) {
      return { ok: false, error: `‘기타’는 모든 질문에 자동으로 들어가요. ${name}에서 ‘기타’ 보기를 지워주세요.` };
    }
    const seen = new Set<string>();
    for (const l of labels) {
      if (seen.has(sameKey(l))) return { ok: false, error: `${name}에 ‘${l}’ 보기가 두 번 있어요.` };
      seen.add(sameKey(l));
    }
    out.push({ id: newId("q"), title, multiple: q.multiple, options: labels.map((label) => ({ id: newId("o"), label })) });
  }
  return { ok: true, value: out };
}

/**
 * 제출할 응답을 검사하고 정리한다. 모든 질문에 답해야 하고, 단일 선택은 보기·기타 중 하나만,
 * 복수 선택은 하나 이상(보기 여러 개와 기타를 함께 골라도 된다). 같은 보기를 여러 번 보내도 한 번으로 센다.
 */
export function normalizeAnswers(questions: OpinionQuestion[], answers: Record<string, OpinionAnswer>): Checked<OpinionAnswers> {
  if (questions.length === 0) return { ok: false, error: "방장이 아직 질문을 만들지 않았어요." };
  const known = new Set(questions.map((q) => q.id));
  if (Object.keys(answers).some((id) => !known.has(id))) {
    return { ok: false, error: "질문이 바뀌었어요. 화면을 새로고침한 뒤 다시 제출해주세요." };
  }
  const out: OpinionAnswers = {};
  for (const q of questions) {
    const a = answers[q.id];
    if (!a) return { ok: false, error: `‘${q.title}’에 답해주세요.` };
    const picked = new Set(a.optionIds);
    const valid = new Set(q.options.map((o) => o.id));
    if ([...picked].some((id) => !valid.has(id))) {
      return { ok: false, error: "선택할 수 없는 보기가 있어요. 화면을 새로고침한 뒤 다시 제출해주세요." };
    }
    let other: string | null = null;
    if (a.other !== null) {
      other = a.other.trim();
      if (!other) return { ok: false, error: `‘${q.title}’의 기타 내용을 적어주세요.` };
      if (other.length > LIMITS.otherText) return { ok: false, error: `기타 내용은 ${LIMITS.otherText}자 이내로 적어주세요.` };
    }
    const count = picked.size + (other === null ? 0 : 1);
    if (count === 0) return { ok: false, error: `‘${q.title}’에서 하나 이상 골라주세요.` };
    if (!q.multiple && count > 1) return { ok: false, error: `‘${q.title}’은(는) 하나만 고를 수 있어요.` };
    // 보기 순서대로 저장
    out[q.id] = { optionIds: q.options.filter((o) => picked.has(o.id)).map((o) => o.id), other };
  }
  return { ok: true, value: out };
}

/**
 * 제출된 응답만 모아 익명 집계를 만든다. 누가 무엇을 골랐는지는 담지 않는다.
 * 보기별 인원은 그 보기를 고른 사람 수라서, 복수 선택 질문은 합이 응답자 수보다 클 수 있다.
 */
export function aggregateOpinions(questions: OpinionQuestion[], responses: OpinionAnswers[]): OpinionResults {
  return {
    respondents: responses.length,
    questions: questions.map((q) => {
      const answers = responses.map((r) => r[q.id]).filter((a): a is OpinionAnswer => Boolean(a));
      const otherTexts = answers.map((a) => a.other).filter((t): t is string => t !== null);
      return {
        questionId: q.id,
        options: q.options.map((o) => ({
          optionId: o.id,
          count: answers.filter((a) => new Set(a.optionIds).has(o.id)).length,
        })),
        otherCount: otherTexts.length,
        // 제출 순서가 드러나지 않게 글자 순으로
        otherTexts: otherTexts.sort((x, y) => x.localeCompare(y, "ko")),
      };
    }),
  };
}

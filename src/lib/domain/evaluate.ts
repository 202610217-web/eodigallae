// 규칙 기반 후보 평가. 필수 조건은 후보를 차단하고, 취향은 점수로만 참고한다.
// 선호 조건(실내/야외, 분위기)은 점수에 넣지 않고 참고 문구로만 보여준다.

import { RESTRICTIONS, TASTES, type CardCategory, type TasteKey } from "./constants";
import type {
  Candidate,
  CandidateEvaluation,
  CardDisplayStatus,
  CardStage,
  CheckState,
  Member,
  MemberCondition,
  TasteRanks,
} from "./types";

export const RANK_POINTS = [3, 2, 1] as const;

export function formatWon(value: number): string {
  if (value >= 10_000 && value % 10_000 === 0) return `${(value / 10_000).toLocaleString("ko-KR")}만원`;
  return `${value.toLocaleString("ko-KR")}원`;
}

/** 한 참가자의 취향 순위와 후보 태그가 겹치는 점수 (1순위 3점, 2순위 2점, 3순위 1점) */
export function memberTasteScore(taste: TasteRanks | null, tags: TasteKey[]): number {
  if (!taste) return 0;
  return taste.reduce((sum, key, i) => (tags.includes(key) ? sum + RANK_POINTS[i] : sum), 0);
}

export function tasteTitle(taste: TasteRanks | null): string | null {
  if (!taste) return null;
  return TASTES.find((t) => t.key === taste[0])?.title ?? null;
}

const RESTRICTION_CONFLICT_TEXT: Record<CardCategory, { conflict: string; clear: string }> = {
  meal: { conflict: "제외 음식 조건과 충돌", clear: "제외 음식 조건 없음" },
  activity: { conflict: "참여 불가 조건과 충돌", clear: "참여 불가 조건 없음" },
  stay: { conflict: "숙소 제외 조건과 충돌", clear: "숙소 제외 조건 없음" },
};

const STATE_ORDER: Record<CheckState, number> = { pass: 0, needs_check: 1, conflict: 2 };

interface EvaluateInput {
  category: CardCategory;
  members: Pick<Member, "id" | "nickname" | "taste">[];
  conditions: MemberCondition[];
  candidates: Candidate[];
}

export function evaluateCandidate(
  candidate: Candidate,
  { category, members, conditions }: Omit<EvaluateInput, "candidates">,
): Omit<CandidateEvaluation, "recommended" | "rank"> {
  const conflicts: string[] = [];
  const needsCheck: string[] = [];
  const reasons: CandidateEvaluation["reasons"] = [];
  const restriction = RESTRICTIONS[category];

  let budgetConflicts = 0;
  let restrictionConflicts = 0;
  let missingConditions = 0;
  let budgetUnknown = false;
  let featuresUnknown = false;
  let anyBudget = false;
  let anyRestriction = false;

  for (const member of members) {
    const cond = conditions.find((c) => c.memberId === member.id);
    if (!cond) {
      missingConditions += 1;
      continue;
    }
    if (cond.maxBudget !== null) {
      anyBudget = true;
      if (candidate.cost === null) budgetUnknown = true;
      else if (candidate.cost > cond.maxBudget) {
        budgetConflicts += 1;
        conflicts.push(`${member.nickname}님 예산 초과 (최대 ${formatWon(cond.maxBudget)})`);
      }
    }
    if (cond.restrictions.length > 0) {
      anyRestriction = true;
      if (candidate.features === null) featuresUnknown = true;
      else {
        const hit = cond.restrictions.filter((r) => candidate.features!.includes(r));
        if (hit.length > 0) {
          restrictionConflicts += 1;
          conflicts.push(`${member.nickname}님 ${restriction.memberLabel}: ${hit.join(", ")}`);
        }
      }
    }
  }

  if (missingConditions > 0) needsCheck.push(`아직 조건을 입력하지 않은 참가자 ${missingConditions}명`);
  const notes = candidate.notes ?? {};
  if (budgetUnknown) {
    needsCheck.push(
      notes.cost ? `비용이 ‘${notes.cost}’(으)로 적혀 있어 예산을 확인할 수 없어요` : "예상 비용 정보가 없어 예산을 확인할 수 없어요",
    );
  }
  if (featuresUnknown) {
    needsCheck.push(
      notes.features
        ? `${restriction.candidateLabel}이(가) ‘${notes.features}’(으)로 적혀 있어 제외 조건을 확인할 수 없어요`
        : `${restriction.candidateLabel} 정보가 없어 제외 조건을 확인할 수 없어요`,
    );
  }

  // 이유 문구: 막는 이유 → 확인 필요 → 통과 근거 → 취향 → 참고 순서
  if (budgetConflicts > 0) reasons.push({ tone: "bad", text: `예산 조건 ${budgetConflicts}건과 충돌` });
  if (restrictionConflicts > 0) reasons.push({ tone: "bad", text: RESTRICTION_CONFLICT_TEXT[category].conflict });
  if (needsCheck.length > 0) reasons.push({ tone: "warn", text: "일부 정보 확인 필요" });

  const everyoneAnswered = missingConditions === 0 && members.length > 0;
  if (everyoneAnswered && budgetConflicts === 0 && !budgetUnknown) {
    reasons.push({ tone: "good", text: anyBudget ? "전원 예산 조건 충족" : "예산 제한을 둔 참가자 없음" });
  }
  if (everyoneAnswered && restrictionConflicts === 0 && !featuresUnknown) {
    reasons.push({ tone: "good", text: anyRestriction ? RESTRICTION_CONFLICT_TEXT[category].clear : "제외 조건을 둔 참가자 없음" });
  }
  // 목록에 없는 특징(기타)은 자동 비교할 수 없어 참고로만 보여준다
  if (candidate.features !== null && notes.features) {
    reasons.push({ tone: "info", text: `${restriction.candidateLabel} 기타: ${notes.features} (참고)` });
  }

  const tasteMembers = members.filter((m) => m.taste !== null);
  let tasteScore = 0;
  let matchedMembers = 0;
  for (const m of tasteMembers) {
    const score = memberTasteScore(m.taste, candidate.tags);
    tasteScore += score;
    if (score > 0) matchedMembers += 1;
  }
  if (tasteMembers.length > 0) {
    reasons.push(
      matchedMembers > 0
        ? { tone: "good", text: `${tasteMembers.length}명 중 ${matchedMembers}명의 선호 취향과 일치` }
        : { tone: "info", text: "참가자 선호 취향과 겹치는 태그 없음" },
    );
  }

  // 선호 조건은 참고 정보만 제공 (점수 반영 없음)
  if (candidate.setting !== "unknown" && candidate.setting !== "other") {
    const n = conditions.filter(
      (c) => c.setting !== "any" && (candidate.setting === "both" || c.setting === candidate.setting),
    ).length;
    if (n > 0) reasons.push({ tone: "info", text: `${n}명의 실내·야외 선호와 맞아요 (참고)` });
  }
  if (candidate.vibe !== "unknown" && candidate.vibe !== "other") {
    const n = conditions.filter((c) => c.vibe === candidate.vibe).length;
    if (n > 0) reasons.push({ tone: "info", text: `${n}명의 분위기 선호와 맞아요 (참고)` });
  }

  const state: CheckState = conflicts.length > 0 ? "conflict" : needsCheck.length > 0 ? "needs_check" : "pass";

  return {
    candidateId: candidate.id,
    state,
    conflicts,
    needsCheck,
    reasons,
    tasteScore,
    matchedMembers,
    tasteMembers: tasteMembers.length,
  };
}

/** 모든 후보를 평가하고 참고용 순위를 매긴다. 순위는 결과를 강제하지 않는다. */
export function evaluateCandidates(input: EvaluateInput): CandidateEvaluation[] {
  const createdAt = new Map(input.candidates.map((c) => [c.id, c.createdAt]));
  const evaluated = input.candidates.map((c) => evaluateCandidate(c, input));
  evaluated.sort(
    (a, b) =>
      STATE_ORDER[a.state] - STATE_ORDER[b.state] ||
      b.tasteScore - a.tasteScore ||
      createdAt.get(a.candidateId)! - createdAt.get(b.candidateId)!,
  );
  const bestPassScore = Math.max(0, ...evaluated.filter((e) => e.state === "pass").map((e) => e.tasteScore));
  return evaluated.map((e, i) => ({
    ...e,
    rank: i + 1,
    recommended: e.state === "pass" && bestPassScore > 0 && e.tasteScore === bestPassScore,
  }));
}

/**
 * 결정 후보 풀. 조건 충돌·확인 필요 후보도 자동으로 빼지 않고, 방장이 결정 시작 전에 고른 후보만 뺀다.
 * 순서는 평가 순서(통과 → 확인 필요 → 충돌, 취향 점수 순)를 따른다.
 */
export function decisionPool(evaluations: CandidateEvaluation[], excludeIds: readonly string[] = []): string[] {
  const excluded = new Set(excludeIds);
  return evaluations.map((e) => e.candidateId).filter((id) => !excluded.has(id));
}

export function cardDisplayStatus(
  stage: CardStage,
  members: Pick<Member, "id">[],
  conditions: MemberCondition[],
): CardDisplayStatus {
  if (stage === "confirmed") return "confirmed";
  if (stage === "deciding") return "deciding";
  const allReady =
    members.length > 0 && members.every((m) => conditions.some((c) => c.memberId === m.id && c.ready));
  return allReady ? "reviewing" : "collecting";
}

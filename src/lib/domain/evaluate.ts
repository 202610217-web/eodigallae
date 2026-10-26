// 카드 상태와 결정 후보 풀. 의견 투표의 질문·보기는 방장이 만든 자유 내용이라
// 후보를 통과·충돌로 판정하거나 점수를 매기지 않는다. 사람들이 집계를 보고 후보를 등록하고 함께 고른다.

import type { Candidate, CardDisplayStatus, CardStage, Member } from "./types";

export function formatWon(value: number): string {
  if (value >= 10_000 && value % 10_000 === 0) return `${(value / 10_000).toLocaleString("ko-KR")}만원`;
  return `${value.toLocaleString("ko-KR")}원`;
}

/** 결정 후보 풀: 등록 순서대로, 방장이 결정 시작 전에 뺀 후보만 제외한다. */
export function decisionPool(candidates: Pick<Candidate, "id" | "createdAt">[], excludeIds: readonly string[] = []): string[] {
  const excluded = new Set(excludeIds);
  return [...candidates]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((c) => c.id)
    .filter((id) => !excluded.has(id));
}

/** 열린 카드는 전원이 의견을 제출하면 '후보 확인', 아니면 '의견 수집 중' */
export function cardDisplayStatus(
  stage: CardStage,
  members: Pick<Member, "id">[],
  submittedMemberIds: readonly string[],
): CardDisplayStatus {
  if (stage === "confirmed") return "confirmed";
  if (stage === "deciding") return "deciding";
  const submitted = new Set(submittedMemberIds);
  const allSubmitted = members.length > 0 && members.every((m) => submitted.has(m.id));
  return allSubmitted ? "reviewing" : "collecting";
}

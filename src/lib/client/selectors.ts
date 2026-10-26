import type { DecisionCardView, Member, RoomView } from "@/lib/domain/types";

// 화면에서 반복해서 쓰는 파생 값 계산

/** 이 카드에 의견을 제출한 인원 */
export function cardSubmittedCount(card: DecisionCardView): number {
  return card.opinion.submittedMemberIds.length;
}

/** 내가 이 카드에 의견을 제출했는지 (다른 카드의 제출은 대신하지 않는다) */
export function hasSubmittedOpinion(card: DecisionCardView, meId: string): boolean {
  return card.opinion.submittedMemberIds.includes(meId);
}

/** 참가자 단위 진행 상태: 아직 열린 카드의 의견을 모두 제출했는지 */
export function memberProgress(view: RoomView, member: Member) {
  const openCards = view.cards.filter((c) => c.stage === "open");
  const readyCards = openCards.filter((c) => c.opinion.submittedMemberIds.includes(member.id)).length;
  return {
    readyCards,
    totalCards: openCards.length,
    ready: readyCards === openCards.length,
  };
}

export function memberName(view: RoomView, memberId: string): string {
  return view.members.find((m) => m.id === memberId)?.nickname ?? "참가자";
}

export type NextStep =
  | { kind: "questions"; card: DecisionCardView }
  | { kind: "opinion"; card: DecisionCardView }
  | { kind: "invite" }
  | { kind: "candidate"; card: DecisionCardView }
  | { kind: "decide"; card: DecisionCardView }
  | { kind: "done" };

/** 보드에서 지금 해야 할 다음 행동 하나를 고른다 */
export function nextStep(view: RoomView): NextStep {
  const openCards = view.cards.filter((c) => c.stage === "open" && !c.locked);
  if (view.me.isHost) {
    const needQuestions = openCards.find((c) => c.opinion.questions.length === 0);
    if (needQuestions) return { kind: "questions", card: needQuestions };
  }
  const needOpinion = openCards.find((c) => c.opinion.questions.length > 0 && !hasSubmittedOpinion(c, view.me.id));
  if (needOpinion) return { kind: "opinion", card: needOpinion };
  if (view.members.length < 2) return { kind: "invite" };
  const deciding = view.cards.find((c) => c.stage === "deciding");
  if (deciding) return { kind: "decide", card: deciding };
  const needCandidate = openCards.find((c) => c.candidates.length === 0 && hasSubmittedOpinion(c, view.me.id));
  if (needCandidate) return { kind: "candidate", card: needCandidate };
  const reviewing = view.cards.find((c) => c.status === "reviewing");
  if (reviewing) return { kind: "decide", card: reviewing };
  return { kind: "done" };
}

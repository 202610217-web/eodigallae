import type { DecisionCardView, Member, RoomView } from "@/lib/domain/types";

// 화면에서 반복해서 쓰는 파생 값 계산

export function cardReadyCount(card: DecisionCardView): number {
  return card.conditions.filter((c) => c.ready).length;
}

export function myCondition(card: DecisionCardView, meId: string) {
  return card.conditions.find((c) => c.memberId === meId) ?? null;
}

/** 참가자 단위 준비 상태: 아직 열린 카드의 조건을 모두 준비 완료했는지 */
export function memberProgress(view: RoomView, member: Member) {
  const openCards = view.cards.filter((c) => c.stage === "open");
  const readyCards = openCards.filter((c) => c.conditions.some((x) => x.memberId === member.id && x.ready)).length;
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
  | { kind: "condition"; card: DecisionCardView }
  | { kind: "invite" }
  | { kind: "candidate"; card: DecisionCardView }
  | { kind: "decide"; card: DecisionCardView }
  | { kind: "done" };

/** 보드에서 지금 해야 할 다음 행동 하나를 고른다 */
export function nextStep(view: RoomView): NextStep {
  const openCards = view.cards.filter((c) => c.stage === "open" && !c.locked);
  const needCondition = openCards.find((c) => !myCondition(c, view.me.id)?.ready);
  if (needCondition) return { kind: "condition", card: needCondition };
  if (view.members.length < 2) return { kind: "invite" };
  const deciding = view.cards.find((c) => c.stage === "deciding");
  if (deciding) return { kind: "decide", card: deciding };
  const needCandidate = openCards.find((c) => c.candidates.length === 0);
  if (needCandidate) return { kind: "candidate", card: needCandidate };
  const reviewing = view.cards.find((c) => c.status === "reviewing");
  if (reviewing) return { kind: "decide", card: reviewing };
  return { kind: "done" };
}

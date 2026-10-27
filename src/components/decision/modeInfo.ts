import { CircleDot, Dices, Shuffle, Vote, type LucideIcon } from "lucide-react";
import type { DecisionMode, LadderTarget } from "@/lib/domain/constants";

// 결정 방식 이름·아이콘·설명. 모임 화면과 홈 소개에서 함께 쓴다.
export const MODE_INFO: Record<DecisionMode, { icon: LucideIcon; title: string; desc: string }> = {
  vote: { icon: Vote, title: "다수결", desc: "한 사람당 한 표. 마감 전에는 득표수를 숨기고, 동점이면 룰렛으로." },
  roulette: { icon: Dices, title: "운명의 룰렛", desc: "결정 대상 후보를 모두 같은 확률로 넣고 돌려요." },
  ladder: { icon: Shuffle, title: "사다리 타기", desc: "사다리를 따라 내려가 당첨 칸에 닿으면 결정권자가 되거나, 후보가 바로 정해져요." },
  marble: { icon: CircleDot, title: "구슬 레이스", desc: "후보 이름을 단 구슬이 장애물을 지나 떨어져요. 가장 먼저 도착한 구슬이 당첨!" },
};

/** 사다리 타기의 두 가지 쓰임 */
export const LADDER_TARGET_INFO: Record<LadderTarget, { title: string; desc: string; prize: string }> = {
  member: { title: "결정권자 정하기", desc: "참가자가 사다리를 타요. 당첨된 사람이 후보 중 하나를 직접 골라요.", prize: "결정권" },
  candidate: { title: "후보 바로 정하기", desc: "후보가 사다리를 타요. 당첨 칸에 닿은 후보로 바로 정해져요.", prize: "당첨" },
};

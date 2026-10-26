import { CircleDot, Dices, Hand, Vote, type LucideIcon } from "lucide-react";
import { BATTLE_TAP_MS, type DecisionMode } from "@/lib/domain/constants";

// 결정 방식 이름·아이콘·설명. 모임 화면과 홈 소개에서 함께 쓴다.
export const MODE_INFO: Record<DecisionMode, { icon: LucideIcon; title: string; desc: string }> = {
  vote: { icon: Vote, title: "다수결", desc: "한 사람당 한 표. 마감 전에는 득표수를 숨기고, 동점이면 룰렛으로." },
  roulette: { icon: Dices, title: "운명의 룰렛", desc: "결정 대상 후보를 모두 같은 확률로 넣고 돌려요." },
  battle: { icon: Hand, title: "결정권 쟁탈전", desc: `${BATTLE_TAP_MS / 1000}초 연타 대결! 1등이 결정 대상 후보 중 하나를 골라요.` },
  marble: { icon: CircleDot, title: "구슬 레이스", desc: "후보 이름을 단 구슬이 장애물을 지나 떨어져요. 가장 먼저 도착한 구슬이 당첨!" },
};

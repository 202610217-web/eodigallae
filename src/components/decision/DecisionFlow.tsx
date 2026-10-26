"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/client/cn";
import type { DecisionCardView } from "@/lib/domain/types";
import { ClickBattlePanel } from "./ClickBattlePanel";
import { DecisionModePicker, MODE_INFO } from "./DecisionModePicker";
import { MarblePanel } from "./MarblePanel";
import { ResultReveal } from "./ResultReveal";
import { RoulettePanel } from "./RoulettePanel";
import { VotingPanel } from "./VotingPanel";

const STEPS = ["방식 선택", "진행", "결과 공개", "확정"];

function stepIndex(card: DecisionCardView): number {
  if (card.stage === "confirmed") return 3;
  if (card.stage === "open") return 0;
  return card.phase === "result" ? 2 : 1;
}

/** 세 가지 결정 방식이 공유하는 바깥 레이아웃. 안쪽 진행 화면만 방식별 패널로 바뀐다. */
export function DecisionFlow({ card, onAddCandidate }: { card: DecisionCardView; onAddCandidate: () => void }) {
  const { view, act } = useRoom();
  const [resetting, setResetting] = useState(false);
  const step = stepIndex(card);
  const info = card.mode ? MODE_INFO[card.mode] : null;
  const Icon = info?.icon;
  const isRouletteResult = card.result?.detail.kind === "roulette";

  const reset = async () => {
    const msg =
      card.stage === "confirmed"
        ? "확정을 취소하고 이 카드를 다시 진행할까요? 확정된 일정에서 빠져요."
        : "진행 중인 결정을 취소할까요? 투표·게임 기록이 초기화되고 후보와 의견을 다시 수정할 수 있어요.";
    if (!window.confirm(msg)) return;
    setResetting(true);
    await act({ type: "resetDecision", cardId: card.id });
    setResetting(false);
  };

  return (
    <div className="space-y-4">
      <ol className="grid grid-cols-4 gap-1" aria-label="결정 진행 단계">
        {STEPS.map((label, i) => (
          <li key={label} className="text-center" aria-current={i === step ? "step" : undefined}>
            <span className={cn("block h-1.5 rounded-full", i <= step ? "bg-coral" : "bg-cream-deep")} />
            <span className={cn("mt-1 block text-[11px] font-semibold sm:text-xs", i === step ? "text-ink" : "text-ink-faint")}>{label}</span>
          </li>
        ))}
      </ol>

      {info && Icon && card.stage !== "open" && (
        <div className="flex items-center gap-3 rounded-[var(--radius-card)] bg-white px-4 py-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-coral-strong text-white">
            <Icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-bold">{info.title}</p>
            <p className="truncate text-xs text-ink-soft">결정 대상 후보 {card.pool.length}개 · 방장이 결정 전에 고른 후보</p>
          </div>
        </div>
      )}

      {card.stage === "open" && <DecisionModePicker card={card} onAddCandidate={onAddCandidate} />}

      {card.stage === "deciding" && (
        <>
          {(card.phase === "roulette_ready" || (card.phase === "result" && isRouletteResult)) && <RoulettePanel key={card.round} card={card} />}
          {card.mode === "vote" && (card.phase === "voting" || card.phase === "tallying" || card.phase === "tie") && <VotingPanel card={card} />}
          {card.mode === "battle" && card.phase !== "result" && <ClickBattlePanel card={card} />}
          {card.mode === "marble" && card.phase !== "result" && <MarblePanel card={card} />}
          {card.phase === "result" && !isRouletteResult && card.result && <ResultReveal card={card} result={card.result} />}
        </>
      )}

      {card.stage === "confirmed" && card.result && <ResultReveal card={card} result={card.result} />}

      {view.me.isHost && card.stage !== "open" && (
        <Button variant="ghost" block loading={resetting} icon={<RotateCcw className="size-4" aria-hidden />} onClick={reset}>
          {card.stage === "confirmed" ? "다시 정하기" : "결정 취소하고 처음으로"}
        </Button>
      )}
    </div>
  );
}

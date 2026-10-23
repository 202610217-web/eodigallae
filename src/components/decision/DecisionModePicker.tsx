"use client";

import { Dices, Hand, Play, SlidersHorizontal, TriangleAlert, Vote, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { useRoom } from "@/components/room/RoomProvider";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/client/cn";
import type { DecisionMode } from "@/lib/domain/constants";
import type { DecisionCardView } from "@/lib/domain/types";

export const MODE_INFO: Record<DecisionMode, { icon: LucideIcon; title: string; desc: string }> = {
  vote: { icon: Vote, title: "다수결", desc: "한 사람당 한 표. 마감 전에는 득표수를 숨기고, 동점이면 룰렛으로." },
  roulette: { icon: Dices, title: "운명의 룰렛", desc: "통과한 후보를 모두 같은 확률로 넣고 돌려요." },
  battle: { icon: Hand, title: "결정권 쟁탈전", desc: "10초 연타 대결! 1등이 통과한 후보 중 하나를 골라요." },
};

export function DecisionModePicker({
  card,
  onAddCandidate,
  onEditConditions,
}: {
  card: DecisionCardView;
  onAddCandidate: () => void;
  onEditConditions: () => void;
}) {
  const { view, act } = useRoom();
  const [mode, setMode] = useState<DecisionMode>("vote");
  const [starting, setStarting] = useState(false);
  const eligible = card.evaluations.filter((e) => e.state === "pass");
  const names = eligible.map((e) => card.candidates.find((c) => c.id === e.candidateId)?.name).filter(Boolean);
  const notReady = view.members.length - card.conditions.filter((c) => c.ready).length;

  if (eligible.length === 0) {
    return (
      <Notice tone="danger" icon={<TriangleAlert className="size-5" aria-hidden />} title="조건을 만족하는 후보가 없어요.">
        <p>
          {card.candidates.length === 0
            ? "아직 등록된 후보가 없어요. 후보를 먼저 등록해주세요."
            : "모든 후보가 필수 조건과 충돌하거나 확인이 필요해요. 결정을 시작하려면 조건을 수정하거나 후보를 추가해주세요."}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" icon={<SlidersHorizontal className="size-3.5" aria-hidden />} onClick={onEditConditions}>
            내 조건 수정
          </Button>
          <Button size="sm" onClick={onAddCandidate}>
            후보 추가하기
          </Button>
        </div>
      </Notice>
    );
  }

  if (!view.me.isHost) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-5 text-center">
        <p className="font-bold">방장이 결정 방식을 고르면 여기서 함께 진행해요.</p>
        <p className="mt-1 text-sm text-ink-soft">현재 필수 조건을 통과한 후보 {eligible.length}개가 결정 대상이에요.</p>
      </div>
    );
  }

  const start = async () => {
    setStarting(true);
    await act({ type: "startDecision", cardId: card.id, mode });
    setStarting(false);
  };

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="결정 방식" className="grid gap-2 md:grid-cols-3">
        {(Object.keys(MODE_INFO) as DecisionMode[]).map((key) => {
          const info = MODE_INFO[key];
          const Icon = info.icon;
          const selected = mode === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(key)}
              className={cn(
                "flex items-start gap-3 rounded-[var(--radius-card)] border-2 bg-white p-4 text-left transition-colors md:flex-col",
                selected ? "border-coral-strong" : "border-transparent hover:border-line",
              )}
            >
              <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", selected ? "bg-coral-strong text-white" : "bg-cream text-ink")}>
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-bold">{info.title}</span>
                <span className="mt-0.5 block text-sm text-ink-soft">{info.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rounded-[var(--radius-card)] bg-white p-4">
        <p className="text-sm font-bold">결정 대상 후보 {eligible.length}개</p>
        <p className="mt-1 text-sm text-ink-soft">{names.join(" · ")}</p>
        <p className="mt-2 text-xs text-ink-soft">필수 조건을 통과한 후보만 포함돼요. 결정 중에는 후보와 조건이 잠겨요.</p>
      </div>

      {notReady > 0 && (
        <Notice tone="warning" icon={<TriangleAlert className="size-5" aria-hidden />} title={`아직 ${notReady}명이 조건 준비를 마치지 않았어요.`}>
          지금 시작하면 그 친구의 조건 변경은 이번 결정에 반영되지 않아요.
        </Notice>
      )}

      <Button size="lg" block loading={starting} icon={<Play className="size-4" aria-hidden />} onClick={start}>
        {MODE_INFO[mode].title}로 결정 시작
      </Button>
    </div>
  );
}
